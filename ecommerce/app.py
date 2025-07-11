from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import json
import os

from flask_cors import CORS

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'secret'

CORS(app)


jwt = JWTManager(app)

DATA_FILE = 'data.json'


@app.route('/', methods=['GET'])
def index():
    return jsonify({'msg': 'API is working ....'})

if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'w') as f:
        json.dump({"users": [], "products": [], "cart": {}, "coupons": {"SAVE10": 10}}, f)

def load_data():
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    db = load_data()
    if any(u['username'] == data['username'] for u in db['users']):
        return jsonify({'msg': 'User already exists'}), 400
    db['users'].append({'username': data['username'], 'password': data['password']})
    save_data(db)
    return jsonify({'msg': 'User registered'})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    db = load_data()
    user = next((u for u in db['users'] if u['username'] == data['username'] and u['password'] == data['password']), None)
    if not user:
        return jsonify({'msg': 'Invalid credentials'}), 401
    token = create_access_token(identity=data['username'])
    return jsonify({'token': token})

@app.route('/products', methods=['GET'])
def get_products():
    db = load_data()
    name = request.args.get('name')
    category = request.args.get('category')
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    products = db['products']
    if name:
        products = [p for p in products if name.lower() in p['name'].lower()]
    if category:
        products = [p for p in products if p['category'] == category]
    if min_price is not None:
        products = [p for p in products if p['price'] >= min_price]
    if max_price is not None:
        products = [p for p in products if p['price'] <= max_price]
    return jsonify(products)

@app.route('/products', methods=['POST'])
@jwt_required()
def add_product():
    data = request.get_json()
    db = load_data()
    data['id'] = len(db['products']) + 1
    db['products'].append(data)
    save_data(db)
    return jsonify({'msg': 'Product added'})

@app.route('/cart', methods=['GET'])
@jwt_required()
def view_cart():
    user = get_jwt_identity()
    db = load_data()
    user_cart = db['cart'].get(user, [])
    enriched_cart = []
    for item in user_cart:
        product = next((p for p in db['products'] if p['id'] == item['product_id']), None)
        if product:
            enriched_cart.append({
                'product_id': item['product_id'],
                'name': product['name'],
                'category': product['category'],
                'price': product['price'],
                'quantity': item['quantity']
            })
    return jsonify(enriched_cart)


@app.route('/cart', methods=['POST'])
@jwt_required()
def add_to_cart():
    user = get_jwt_identity()
    data = request.get_json()
    db = load_data()
    if user not in db['cart']:
        db['cart'][user] = []
    existing = next((item for item in db['cart'][user] if item['product_id'] == data['product_id']), None)
    if existing:
        existing['quantity'] += data.get('quantity', 1)
    else:
        db['cart'][user].append({'product_id': data['product_id'], 'quantity': data.get('quantity', 1)})
    save_data(db)
    return jsonify({'msg': 'Added to cart'})

@app.route('/cart', methods=['PUT'])
@jwt_required()
def update_cart():
    user = get_jwt_identity()
    data = request.get_json()
    db = load_data()
    for item in db['cart'].get(user, []):
        if item['product_id'] == data['product_id']:
            item['quantity'] = data['quantity']
    save_data(db)
    return jsonify({'msg': 'Cart updated'})

@app.route('/cart', methods=['DELETE'])
@jwt_required()
def remove_from_cart():
    user = get_jwt_identity()
    product_id = request.args.get('product_id', type=int)
    db = load_data()
    db['cart'][user] = [item for item in db['cart'].get(user, []) if item['product_id'] != product_id]
    save_data(db)
    return jsonify({'msg': 'Item removed'})

@app.route('/apply-coupon', methods=['POST'])
@jwt_required()
def apply_coupon():
    user = get_jwt_identity()
    db = load_data()
    code = request.json['code']
    user_cart = db['cart'].get(user, [])
    total = 0
    for item in user_cart:
        product = next((p for p in db['products'] if p['id'] == item['product_id']), None)
        if product:
            total += item['quantity'] * product['price']
    discount = db['coupons'].get(code.upper(), 0)
    final_total = total - (total * discount / 100)
    return jsonify({
        'total': total,
        'discount': discount,
        'final_total': round(final_total, 2)
    })


@app.route('/checkout', methods=['POST'])
@jwt_required()
def checkout():
    user = get_jwt_identity()
    db = load_data()
    db['cart'][user] = []
    save_data(db)
    return jsonify({'msg': 'Order placed'})

if __name__ == '__main__':
    app.run(debug=True)
