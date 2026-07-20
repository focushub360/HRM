import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FaCheckCircle, FaTrash, FaComments, FaPaperPlane, FaTimes } from 'react-icons/fa';

const SalesTasks = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Chat State
    const [selectedTask, setSelectedTask] = useState(null);
    const [chatMessage, setChatMessage] = useState('');
    const chatEndRef = useRef(null);

    // Form
    const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '' });

    useEffect(() => {
        fetchTasks();
        fetchEmployees();

        // Auto-refresh tasks every 30 seconds to sync Chat/Status
        const interval = setInterval(fetchTasks, 30000);
        return () => clearInterval(interval);
    }, [user]);

    // Scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedTask]);

    const fetchTasks = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}/tasks/${user.companyId}`);
            if (response.ok) setTasks(await response.json());
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const fetchEmployees = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}/companies/${user.companyId}/employees`);
            if (response.ok) {
                const allEmployees = await response.json();
                // Only show Sales Team in the assignment list
                const salesTeam = allEmployees.filter(emp => emp.employeeType === 'sales' || emp.employeeType === 'Sales & Marketing');
                setEmployees(salesTeam);
            }
        } catch (error) { console.error(error); }
    };

    const handleAssign = async () => {
        if (!newTask.title || !newTask.assignedTo) {
            alert("Title and Assignee required");
            return;
        }
        try {
            await fetch(`${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyId: user.companyId,
                    ...newTask,
                    createdBy: user.id
                })
            });
            setNewTask({ title: '', description: '', assignedTo: '' });
            fetchTasks();
            alert("Task assigned!");
        } catch (error) { alert("Failed to assign task"); }
    };

    const handleReply = async () => {
        if (!chatMessage.trim() || !selectedTask) return;

        const newMessage = {
            sender: user.name || 'HR Admin',
            senderId: user.id, // HR/Admin ID
            text: chatMessage,
            timestamp: new Date().toISOString()
        };

        const updatedMessages = [...(selectedTask.messages || []), newMessage];

        try {
            // Optimistic Update
            const updatedTask = { ...selectedTask, messages: updatedMessages };
            setSelectedTask(updatedTask);
            setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));

            await fetch(`${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}/tasks/${selectedTask.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updatedMessages })
            });

            setChatMessage('');
        } catch (error) {
            console.error(error);
            alert('Failed to send message');
        }
    };

    return (
        <div className={`container-fluid py-3 ${theme === 'dark' ? 'text-light' : 'text-dark'}`} style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <h2 className="mb-3 fw-bold">Task Assignment & Tracking</h2>

            {/* Assignment Form */}
            <div className={`card shadow-sm border-0 mb-3 ${theme === 'dark' ? 'bg-dark' : 'bg-white'}`}>
                <div className={`card-body py-3 ${theme === 'dark' ? 'text-light' : 'text-dark'}`}>
                    <h5 className="card-title fw-bold mb-2">Assign New Task</h5>
                    <div className="row g-2">
                        <div className="col-md-4">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Task Title"
                                value={newTask.title}
                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                            />
                        </div>
                        <div className="col-md-4">
                            <select
                                className="form-select"
                                value={newTask.assignedTo}
                                onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                            >
                                <option value="">Select Employee...</option>
                                <option value="all">All Employees</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.empId}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <button className="btn btn-primary w-100" onClick={handleAssign}>Assign Task</button>
                        </div>
                        <div className="col-12">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Description (Optional)"
                                value={newTask.description}
                                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Task List */}
            <div className={`card shadow-sm border-0 flex-grow-1 ${theme === 'dark' ? 'bg-dark' : 'bg-white'}`} style={{ minHeight: 0 }}>
                <div className={`card-body d-flex flex-column ${theme === 'dark' ? 'text-light' : 'text-dark'}`}>
                    <h5 className="card-title fw-bold mb-3">Assigned Tasks</h5>
                    <div className="table-responsive flex-grow-1" style={{ overflowY: 'auto' }}>
                        <table className={`table table-hover align-middle mb-0 ${theme === 'dark' ? 'table-dark' : ''}`}>
                            <thead className={`${theme === 'dark' ? 'table-dark' : 'table-light'} sticky-top`} style={{ zIndex: 1 }}>
                                <tr>
                                    <th>Task</th>
                                    <th>Assigned To</th>
                                    <th>Status</th>
                                    <th>Discussion</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map(task => (
                                    <tr key={task.id}>
                                        <td>
                                            <div className="fw-bold">{task.title}</div>
                                            <small className={theme === 'dark' ? 'text-white-50' : 'text-muted'}>{task.description}</small>
                                        </td>
                                        <td>
                                            {task.assignedTo === 'all' ? <span className="badge bg-secondary">All Team</span> :
                                                employees.find(e => e.empId === task.assignedTo)?.name || task.assignedTo}
                                        </td>
                                        <td>
                                            <span className={`badge ${task.status === 'Completed' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                {task.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={`btn btn-sm ${task.messages?.length > 0 ? 'btn-info text-white' : 'btn-outline-secondary'}`}
                                                onClick={() => setSelectedTask(task)}
                                            >
                                                <FaComments className="me-1" />
                                                {task.messages?.length || 0} msgs
                                            </button>
                                        </td>
                                        <td>
                                            {/* Delete or other actions could go here */}
                                            <button className="btn btn-sm btn-outline-danger border-0"><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Chat Modal */}
            {selectedTask && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className={`modal-content shadow ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-bold"><FaComments className="me-2 text-primary" /> {selectedTask.title}</h5>
                                <button type="button" className="btn-close" style={theme === 'dark' ? { filter: 'invert(1)' } : {}} onClick={() => setSelectedTask(null)}></button>
                            </div>
                            <div className="modal-body p-0 d-flex flex-column" style={{ height: '400px' }}>
                                <div className="flex-grow-1 p-3" style={{ overflowY: 'auto', backgroundColor: theme === 'dark' ? '#2c3034' : '#f8f9fa' }}>
                                    {selectedTask.messages && selectedTask.messages.length > 0 ? (
                                        selectedTask.messages.map((msg, idx) => (
                                            <div key={idx} className={`d-flex mb-3 ${msg.senderId === user.id ? 'justify-content-end' : 'justify-content-start'}`}>
                                                <div className={`card border-0 shadow-sm ${msg.senderId === user.id ? 'bg-primary text-white' : 'bg-white text-dark'}`} style={{ maxWidth: '75%', borderRadius: '15px' }}>
                                                    <div className="card-body p-2 px-3">
                                                        <small className={`fw-bold d-block mb-1 ${msg.senderId === user.id ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>
                                                            {msg.sender}
                                                        </small>
                                                        <p className="mb-0">{msg.text}</p>
                                                        <small className={`d-block mt-1 text-end ${msg.senderId === user.id ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-muted mt-5">No discussion yet. Start the conversation!</div>
                                    )}
                                    <div ref={chatEndRef}></div>
                                </div>
                                <div className="p-3 border-top bg-light input-group">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Type your reply..."
                                        value={chatMessage}
                                        onChange={(e) => setChatMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                                    />
                                    <button className="btn btn-primary" onClick={handleReply}><FaPaperPlane /> Send</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesTasks;
