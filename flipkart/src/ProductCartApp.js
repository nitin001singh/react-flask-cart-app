import React, { useEffect, useState } from 'react'
import axios from 'axios'

function ProductCartApp() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [coupon, setCoupon] = useState('')
  const [totals, setTotals] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    axios.get('http://localhost:5000/products').then(res => setProducts(res.data))
  }, [])

  const login = async () => {
    try {
      const res = await axios.post('http://localhost:5000/login', { username, password })
      setToken(res.data.token)
      setMessage('Logged in')
      loadCart(res.data.token)
    } catch {
      setMessage('Login failed')
    }
  }

  const loadCart = async (tok) => {
    try {
      const res = await axios.get('http://localhost:5000/cart', {
        headers: { Authorization: `Bearer ${tok}` }
      })
      setCart(res.data)
    } catch {
      setCart([])
    }
  }

  const addToCart = async (id) => {
    if (!token) {
      alert('Please login first')
      return
    }
    await axios.post('http://localhost:5000/cart', { product_id: id, quantity: 1 }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    loadCart(token)
  }

  const updateQuantity = async (productId, quantity) => {
    if (!token || quantity < 1) return
        await axios.put('http://localhost:5000/cart', { product_id: productId, quantity }, {
            headers: { Authorization: `Bearer ${token}` }
        })
    loadCart(token)
    }

  const applyCoupon = async () => {
    if (!token) return
    try {
      const res = await axios.post('http://localhost:5000/apply-coupon', { code: coupon }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTotals(res.data)
    } catch {
      setTotals(null)
    }
  }

const placeOrder = async () => {
  if (!token) return
  try {
    await axios.post('http://localhost:5000/checkout', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    setCart([])
    setTotals(null)
    setCoupon('')
    setMessage('Successfully Purchased!')
  } catch {
    setMessage('Order failed')
  }
}


  return (
    <div style={{ padding: 20 }}>
      <h2>Product Listing</h2>
      <table border="1" cellPadding="10">
        <thead>
          <tr><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Action</th></tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td>₹{p.price}</td>
              <td><button onClick={() => addToCart(p.id)}>Add to Cart</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 40 }}>Login</h2>
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
      <p>{message}</p>

     <h2>Cart</h2>
        {token && cart.length > 0 ? (
    <>
        <table border="1" cellPadding="10">
        <thead>
            <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Subtotal</th>
            <th>Action</th>
            </tr>
        </thead>
        <tbody>
            {cart.map((c, idx) => (
            <tr key={idx}>
                <td>{c.name}</td>
                <td>{c.category}</td>
                <td>₹{c.price}</td>
                <td>{c.quantity}</td>
                <td>₹{c.price * c.quantity}</td>
                <td>
                <button onClick={() => updateQuantity(c.product_id, c.quantity + 1)}>+</button>
                <button onClick={() => updateQuantity(c.product_id, c.quantity - 1)} disabled={c.quantity === 1}>-</button>
                </td>
            </tr>
            ))}
        </tbody>
        </table>

        <div style={{ marginTop: 10, fontWeight: 'bold' }}>
        Total Amount: ₹{cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
        </div>

        <div style={{ marginTop: 20 }}>
        <input placeholder="Coupon Code" value={coupon} onChange={e => setCoupon(e.target.value)} />
        <button onClick={applyCoupon}>Apply Coupon</button>
        </div>

        {totals && (
        <div style={{ marginTop: 10 }}>
            <p>Total Before Discount: ₹{totals.total}</p>
            <p>Discount: {totals.discount}%</p>
            <p style={{ fontWeight: 'bold' }}>Final Amount: ₹{totals.final_total}</p>
        </div>
        )}

       <button onClick={placeOrder} style={{ marginTop: 10 }}>Place Order</button>
        {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}

    </>
    ) : token ? (
    <p>No items in cart</p>
    ) : (
    <p>Please login to view cart</p>
    )}


    </div>
  )
}

export default ProductCartApp
