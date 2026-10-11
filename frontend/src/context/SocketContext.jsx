import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [priceUpdates, setPriceUpdates] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('price_update', (updates) => {
      const map = {};
      updates.forEach(u => { map[u.symbol] = u; });
      setPriceUpdates(prev => ({ ...prev, ...map }));
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  const subscribeTo = (symbols) => {
    if (socket && symbols.length > 0) {
      socket.emit('subscribe_stocks', symbols);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, priceUpdates, connected, subscribeTo }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
