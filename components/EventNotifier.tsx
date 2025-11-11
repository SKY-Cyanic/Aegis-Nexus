import React, { useState, useEffect } from 'react';
import { gameBus } from '../bridge/eventBus';
import { GameEvent, GameEventPayload } from '../types';

const EventNotifier: React.FC = () => {
  const [event, setEvent] = useState<GameEventPayload | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleGameEvent = (payload: GameEventPayload) => {
      setEvent(payload);
      setVisible(true);

      setTimeout(() => {
        setVisible(false);
      }, 5000); // Notification visible for 5 seconds
    };

    const unsubscribe = gameBus.on(GameEvent.GAME_EVENT_START, handleGameEvent);

    return () => {
      unsubscribe();
    };
  }, []);

  if (!event) return null;

  return (
    <div
      className={`absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-slate-800/90 border-2 border-amber-400 rounded-lg text-center shadow-lg shadow-amber-500/20 z-20 transition-all duration-500 ease-in-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
      }`}
    >
      <h3 className="text-xl font-bold text-amber-400 tracking-widest">{event.title}</h3>
      <p className="text-slate-300 mt-1">{event.message}</p>
    </div>
  );
};

export default EventNotifier;
