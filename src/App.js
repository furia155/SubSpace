// src/App.js
import React, { useState, useEffect } from 'react';
import { Container, Navbar, Nav, Button, Row, Col, Card, Modal } from 'react-bootstrap';
import './App.css';
import AuthTabs from './AuthTabs';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { useMemo } from 'react';

function App() {

  // Login/Register
  const [showModal, setShowModal] = useState(false);
  const handleClose = () => setShowModal(false);
  const handleShow = () => setShowModal(true);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const handleAuthClose = () => setShowAuthModal(false);

  const [user, setUser] = useState(null);

  // Subscription list
  const db = getFirestore();
  const [subscriptions, setSubscriptions] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  // This will be passed to AuthTabs to close modal on successful auth
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [])

  // Show sub list to users
  useEffect(() => {
    if (!user) {
      setSubscriptions([]);
      return;
    }

    const q = query(collection(db, "subscriptions"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const subs = [];
      querySnapshot.forEach((doc) => {
        subs.push({ id: doc.id, ...doc.data() });
      });
      setSubscriptions(subs);
    });

    return () => unsubscribe();
  }, [user, db])

  const addSubscription = async (e) => {
    e.preventDefault();
    if (!name || !price || !date) return;

    await addDoc(collection(db, "subscriptions"), {
      userId: user.uid,
      name,
      price: parseFloat(price),
      date,
      createdAt: serverTimestamp()
    });

    setName('');
    setPrice('');
    setDate('');
  };

  const removeSubscription = async (id) => {
    await deleteDoc(doc(db, "subscriptions", id));
  };

  // Payment date calculation

    // Helper to get day of month from subscription date string
  const getDueDay = (dateStr) => {
    // Assuming dateStr is 'YYYY-MM-DD', extract day
    return new Date(dateStr).getDate();
  }

  const today = new Date().getDate();

  const paymentsLeft = useMemo(() => {
    if (!subscriptions || subscriptions.length === 0) return { count: 0, total: 0 };

    let count = 0;
    let total = 0;

    subscriptions.forEach(sub => {
      const dueDay = getDueDay(sub.date);
      if (dueDay >= today) {
        count++;
        total += sub.price;
      }
    });

    return { count, total };
  }, [subscriptions, today]);

  const subscriptionsLeftToPay = useMemo(() => {
    if (!subscriptions || subscriptions.length === 0) return [];

    return subscriptions.filter(sub => {
      const dueDay = getDueDay(sub.date);
      return dueDay >= today;
    });
  }, [subscriptions, today]);

  // generate current date for calc
  const getDueDateFormatted = (dateStr) => {
  const day = new Date(dateStr).getDate();
  const today = new Date();
  const dueDate = new Date(today.getFullYear(), today.getMonth(), day);
    return dueDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };


  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Navbar */}
      <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
        <Container>
          <Navbar.Brand href="#home">
            <img
              src={process.env.PUBLIC_URL + "/subspace.png"}
              alt="Subspace Logo"
              height="40"
              className="d-inline-block align-top logo-glow"
            />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="navbar-nav" />
          <Navbar.Collapse id="navbar-nav" className="justify-content-end">
            <Nav className="align-items-center">
              {user ? (
                <>
                  <Navbar.Text className="text-light me-3">
                    Logged in as: <strong>{user.email}</strong>
                  </Navbar.Text>
                  <Button variant="outline-light" size="sm" onClick={() => signOut(auth)}>
                    Logout
                  </Button>
                </>
              ) : (
                <Button variant="outline-light" onClick={() => setShowAuthModal(true)}>
                  Login / Register
                </Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Hero Section */}
      <div className="bg-dark text-light text-center py-5">
        <Container>
          <h1 className="display-4">Take Control of Your Subscriptions</h1>
          <p className="lead">Track and manage recurring payments with ease.</p>
          <Button className="glow-button" variant="primary" size="lg" onClick={handleShow}>
            Download
          </Button>
        </Container>
      </div>

      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Select Your Platform</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <Button variant="outline-primary" className="m-2" href={process.env.PUBLIC_URL + "/The Download.txt"} download>
            Windows
          </Button>
          <Button variant="outline-success" className="m-2" href={process.env.PUBLIC_URL + "/The Download.txt"} download>
            Linux
          </Button>
          <Button variant="outline-warning" className="m-2" href={process.env.PUBLIC_URL + "/The Download.txt"} download>
            Android
          </Button>
        </Modal.Body>
      </Modal>

      {/* Features Section */}
      <Container id="features" className="my-5">
        <h2 className="text-center mb-4">Features</h2>
        <Row>
          {[
            { title: 'Track Subscriptions', desc: 'Stay on top of all your recurring charges.' },
            { title: 'Spending Insights', desc: 'Visualize your monthly and yearly spending.' },
            { title: 'Upcoming Payments', desc: 'Never miss a due date again.' },
            { title: 'Smart Reminders', desc: 'Receive alerts before payments are due.' },
          ].map((feature, idx) => (
            <Col key={idx} md={6} lg={3} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <Card.Title>{feature.title}</Card.Title>
                  <Card.Text>{feature.desc}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Subscriptions */}
      {user && (
        <Container className="my-5">
          <h2 className="text-center mb-4">Your Subscriptions</h2>
          <form onSubmit={addSubscription} className="mb-4 d-flex gap-2 justify-content-center flex-wrap">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="form-control"
              style={{ maxWidth: 200 }}
            />
            <input
              type="number"
              placeholder="Price"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              step="0.01"
              min="0"
              className="form-control"
              style={{ maxWidth: 120 }}
            />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="form-control"
              style={{ maxWidth: 180 }}
            />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>

          {subscriptions.length === 0 ? (
            <p className="text-center text-muted">No subscriptions added yet.</p>
          ) : (
            <Row>
              {subscriptions.map(sub => (
                <Col key={sub.id} md={6} lg={4} className="mb-3">
                  <Card>
                    <Card.Body className="d-flex justify-content-between align-items-center">
                      <div>
                        <Card.Title>{sub.name}</Card.Title>
                        <Card.Text>Price: ${sub.price.toFixed(2)}</Card.Text>
                        <Card.Text>Date: {sub.date}</Card.Text>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => removeSubscription(sub.id)}>Remove</Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      )}

      {/* List of subscriptions to pay this month */}

      {user && (
        <Container className="my-3 text-center">
          <h5>Payments Left This Month: {paymentsLeft.count}</h5>
          <h5>Total Price to Pay: ${paymentsLeft.total.toFixed(2)}</h5>

          <h6 className="mt-4">Subscriptions Left to Pay:</h6>
          {subscriptionsLeftToPay.length === 0 ? (
            <p>No upcoming payments this month.</p>
          ) : (
            <ul className="list-unstyled">
              {subscriptionsLeftToPay.map(sub => (
                <li key={sub.id}>
                  {sub.name} — ${sub.price.toFixed(2)} (Due: {getDueDateFormatted(sub.date)})
                </li>
              ))}
            </ul>
          )}
        </Container>
      )}


      {/* Contact Section */}
      <div className="bg-light py-5" id="contact">
        <Container>
          <h2 className="text-center mb-4">Contact Us</h2>
          <p className="text-center">
            Have questions or feedback? Reach us at{' '}
            <a href="mailto:22658@student.ansleszno.pl">22658@student.ansleszno.pl</a>
          </p>
        </Container>
      </div>

      {/* Footer */}
      <footer className="bg-dark text-light text-center py-3 mt-auto">
        <Modal show={showAuthModal} onHide={handleAuthClose} centered>
          <Modal.Header closeButton>
            <Modal.Title>Account Access</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <AuthTabs onAuthSuccess={handleAuthSuccess} />
          </Modal.Body>
        </Modal>
        <Container>
          <small>&copy; {new Date().getFullYear()} Subspace. All rights reserved.</small>
        </Container>
      </footer>
    </div>
  );
}

export default App;
