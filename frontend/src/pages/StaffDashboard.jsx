import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';

/**
 * Staff dashboard displays a list of incomplete orders and open tickets. Staff
 * members can mark orders as completed or cancelled and respond to support
 * tickets. Admins share the same interface via role permissions.
 */
const StaffDashboard = () => {
  const { token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);

  const fetchData = async () => {
    const ordersRes = await axios.get('/api/staff/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setOrders(ordersRes.data);
    const ticketsRes = await axios.get('/api/staff/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTickets(ticketsRes.data);
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const updateStatus = async (id, status) => {
    await axios.put(
      `/api/staff/orders/${id}`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    fetchData();
  };

  const replyTicket = async (id, text) => {
    await axios.post(
      `/api/tickets/${id}/message`,
      { text },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    fetchData();
  };

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold mb-4">Staff Dashboard</h2>
        <h3 className="text-xl font-semibold mb-2">Pending Orders</h3>
        <div className="overflow-auto mb-6">
          <table className="min-w-full bg-white shadow rounded">
            <thead>
              <tr>
                <th className="px-4 py-2 border">API ID</th>
                <th className="px-4 py-2 border">User</th>
                <th className="px-4 py-2 border">Service</th>
                <th className="px-4 py-2 border">Quantity</th>
                <th className="px-4 py-2 border">Status</th>
                <th className="px-4 py-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id}>
                  <td className="px-4 py-2 border">{o.apiOrderId || '-'}</td>
                  <td className="px-4 py-2 border">{o.user?.username}</td>
                  <td className="px-4 py-2 border">{o.serviceName}</td>
                  <td className="px-4 py-2 border">{o.quantity}</td>
                  <td className="px-4 py-2 border">{o.status}</td>
                  <td className="px-4 py-2 border space-x-2">
                    <button
                      className="bg-green-500 text-white px-2 py-1 rounded"
                      onClick={() => updateStatus(o._id, 'Completed')}
                    >
                      Complete
                    </button>
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => updateStatus(o._id, 'Cancelled')}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="text-xl font-semibold mb-2">Open Tickets</h3>
        {tickets.length === 0 ? (
          <p>No open tickets</p>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => (
              <TicketCard key={t._id} ticket={t} onReply={replyTicket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TicketCard = ({ ticket, onReply }) => {
  const [text, setText] = useState('');
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">{ticket.subject}</h4>
        <span className="text-sm">{ticket.status}</span>
      </div>
      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
        {ticket.messages.map((m, idx) => (
          <div key={idx} className="text-sm">
            <strong>{m.sender === ticket.user._id ? 'User' : 'Staff'}:</strong> {m.text}
          </div>
        ))}
      </div>
      <div className="mt-2">
        <textarea
          rows="2"
          className="w-full border rounded px-2 py-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
        ></textarea>
        <button
          className="mt-1 bg-blue-500 text-white px-3 py-1 rounded"
          onClick={() => {
            onReply(ticket._id, text);
            setText('');
          }}
        >
          Reply
        </button>
      </div>
    </div>
  );
};

export default StaffDashboard;