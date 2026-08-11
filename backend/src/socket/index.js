export const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-room', (userId) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined room ${userId}`);
    });

    socket.on('tracking-data', (data) => {
      io.to(`company_${data.companyId}`).emit('employee-update', data);
    });

    socket.on('join-company-room', (companyId) => {
      socket.join(`company_${companyId}`);
      console.log(`Socket ${socket.id} joined company room ${companyId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};