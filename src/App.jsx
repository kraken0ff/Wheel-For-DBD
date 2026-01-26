import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './App.css';
import { KILLERS_RU, MAPS, MUTATORS, PERKS_META, PERKS_ALL } from './gameData';

// --- ЗВУК ТИКАНЬЯ (Base64 короткий клик) ---
const playTick = () => {
  const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"); // Очень короткий пустой звук, просто триггер, лучше синтез:
  
  // Лучше используем Web Audio API для генерации клика без загрузки файлов
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05);
  
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
};

const WheelSegment = ({ index, total, player }) => {
  const angle = 360 / total;
  const rotate = angle * index;
  const isEven = index % 2 === 0;
  
  return (
    <g transform={`rotate(${rotate}, 200, 200)`}>
      <path 
        d={`M200,200 L200,0 A200,200 0 0,1 ${200 + 200 * Math.sin(angle * Math.PI / 180)},${200 - 200 * Math.cos(angle * Math.PI / 180)} Z`} 
        fill={isEven ? '#1a1a1a' : '#252525'}
        stroke="#111"
        strokeWidth="1"
      />
      <text
        x="200"
        y="40"
        fill="#fff"
        fontSize={total > 8 ? "10" : "14"}
        fontFamily="Bebas Neue"
        textAnchor="middle"
        transform={`rotate(${angle / 2}, 200, 200)`}
        style={{ letterSpacing: '1px' }}
      >
        {player.name.length > 10 ? player.name.slice(0, 8) + '..' : player.name}
      </text>
    </g>
  );
};

const App = () => {
  // --- STATE ---
  const [players, setPlayers] = useState(() => {
    const saved = localStorage.getItem('dbd-randomizer-players');
    return saved ? JSON.parse(saved) : Array.from({ length: 4 }, (_, i) => ({
      id: Date.now() + i,
      name: `Player ${i + 1}`,
      killers: [...KILLERS_RU],
      hasPlayed: false
    }));
  });

  const [settings, setSettings] = useState({
    elimination: true, // По умолчанию включено
    perks: false,
    perksMode: 'meta', // 'meta' or 'hardcore'
    maps: false,
    mutators: false
  });

  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [rotation, setRotation] = useState(0);

  // Список тех, кто сейчас на колесе
  const activePlayers = useMemo(() => {
    if (settings.elimination) {
      return players.filter(p => !p.hasPlayed);
    }
    return players;
  }, [players, settings.elimination]);

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem('dbd-randomizer-players', JSON.stringify(players));
  }, [players]);

  // --- ACTIONS ---
  const addPlayer = () => {
    setPlayers(prev => [...prev, {
      id: Date.now(),
      name: `Игрок ${prev.length + 1}`,
      killers: [...KILLERS_RU],
      hasPlayed: false
    }]);
  };

  const removePlayer = (id) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const resetElimination = () => {
    setPlayers(prev => prev.map(p => ({ ...p, hasPlayed: false })));
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const spin = () => {
    if (isSpinning || activePlayers.length === 0) return;
    
    setIsSpinning(true);
    setWinner(null);

    // Звуковой эффект тиканья
    let ticks = 0;
    const totalTime = 5000;
    const interval = setInterval(() => {
      ticks++;
      // Тикаем реже к концу
      if (Math.random() > (ticks / 50)) {
        playTick();
      }
    }, 100);

    const spins = 5 + Math.random() * 5;
    const segmentAngle = 360 / activePlayers.length;
    // Добавляем рандом, чтобы стрелка попадала в центр сектора +/-
    const randomOffset = Math.random() * 360; 
    const newRotation = rotation + (spins * 360) + randomOffset;
    
    setRotation(newRotation);

    setTimeout(() => {
      clearInterval(interval);
      calculateWinner(newRotation);
      setIsSpinning(false);
    }, totalTime);
  };

  const calculateWinner = (finalRotation) => {
    const count = activePlayers.length;
    const normalizedRotation = finalRotation % 360;
    const effectiveAngle = (360 - normalizedRotation) % 360;
    const segmentSize = 360 / count;
    
    const index = Math.floor(effectiveAngle / segmentSize);
    const winPlayer = activePlayers[index];

    // Выбираем маньяка
    const pool = winPlayer.killers.length ? winPlayer.killers : ["Нет маньяков"];
    const winKiller = pool[Math.floor(Math.random() * pool.length)];

    // Генерируем доп. контент
    let extraData = {};
    
    if (settings.perks) {
      const source = settings.perksMode === 'meta' ? PERKS_META : PERKS_ALL;
      // Shuffle and take 4
      extraData.perks = [...source].sort(() => 0.5 - Math.random()).slice(0, 4);
    }
    
    if (settings.maps) {
      extraData.map = MAPS[Math.floor(Math.random() * MAPS.length)];
    }

    if (settings.mutators) {
      extraData.mutator = MUTATORS[Math.floor(Math.random() * MUTATORS.length)];
    }

    // Обновляем статус "играл"
    if (settings.elimination) {
      setPlayers(prev => prev.map(p => p.id === winPlayer.id ? { ...p, hasPlayed: true } : p));
    }

    setWinner({ p: winPlayer, k: winKiller, ...extraData });
    
    confetti({
      particleCount: 250,
      spread: 120,
      origin: { y: 0.6 },
      colors: ['#ff2e4c', '#ffffff', '#ffaa00']
    });
  };

  const handleNameChange = (id, val) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name: val } : p));
  };

  const toggleAllKillers = (pId) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== pId) return p;
      return { ...p, killers: p.killers.length === KILLERS_RU.length ? [] : [...KILLERS_RU] };
    }));
  };

  return (
    <>
      <div className="bg-noise"></div>
      
      <div className="app-container">
        <h1>DBD <span>RANDOMIZER</span></h1>

        {/* SETTINGS PANEL */}
        <div className="settings-panel glass-card">
          <div className="setting-group">
            <label className="switch-label">
              <input type="checkbox" checked={settings.elimination} onChange={() => toggleSetting('elimination')} />
              <span className="slider round"></span>
              <span className="label-text">На выбывание</span>
            </label>
            {settings.elimination && activePlayers.length < players.length && (
              <button className="reset-btn" onClick={resetElimination}>СБРОС КРУГА ({players.length - activePlayers.length})</button>
            )}
          </div>
          
          <div className="divider"></div>

          <div className="setting-group">
            <label className="switch-label">
              <input type="checkbox" checked={settings.perks} onChange={() => toggleSetting('perks')} />
              <span className="slider round"></span>
              <span className="label-text">Перки</span>
            </label>
            {settings.perks && (
               <button 
                 className="mode-btn" 
                 onClick={() => setSettings(s => ({...s, perksMode: s.perksMode === 'meta' ? 'hardcore' : 'meta'}))}
               >
                 {settings.perksMode === 'meta' ? 'META' : 'CHAOS'}
               </button>
            )}
          </div>

          <div className="setting-group">
             <label className="switch-label">
              <input type="checkbox" checked={settings.maps} onChange={() => toggleSetting('maps')} />
              <span className="slider round"></span>
              <span className="label-text">Карта</span>
            </label>
            <label className="switch-label">
              <input type="checkbox" checked={settings.mutators} onChange={() => toggleSetting('mutators')} />
              <span className="slider round"></span>
              <span className="label-text">Условия</span>
            </label>
          </div>
        </div>

        {/* WHEEL AREA */}
        <div className="wheel-stage">
          <div className="wheel-glow"></div>
          <svg className="wheel-pointer" width="40" height="40" viewBox="0 0 40 40" style={{ zIndex: 10 }}>
             <path d="M20 40 L0 0 L40 0 Z" fill="#ff2e4c" />
          </svg>

          {activePlayers.length > 0 ? (
            <motion.div
              style={{ 
                width: 400, height: 400,
                borderRadius: '50%',
                boxShadow: '0 0 0 10px #111, 0 0 0 12px #333',
              }}
              animate={{ rotate: rotation }}
              transition={{ duration: 5, ease: [0.15, 0, 0.10, 1] }}
            >
              <svg viewBox="0 0 400 400" width="100%" height="100%">
                {activePlayers.map((p, i) => (
                  <WheelSegment key={p.id} index={i} total={activePlayers.length} player={p} />
                ))}
              </svg>
            </motion.div>
          ) : (
            <div className="empty-wheel">
              <p>ВСЕ СЫГРАЛИ!</p>
              <button onClick={resetElimination}>НОВЫЙ КРУГ</button>
            </div>
          )}
        </div>

        <div className="controls-row">
           <button className="icon-btn remove" onClick={() => setPlayers(p => p.slice(0, -1))} disabled={players.length <= 1}>−</button>
           <button className="spin-btn" onClick={spin} disabled={isSpinning || activePlayers.length === 0}>
              {isSpinning ? "ВРАЩЕНИЕ..." : "START TRIAL"}
           </button>
           <button className="icon-btn add" onClick={addPlayer}>+</button>
        </div>

        {/* PLAYER GRID */}
        <div className="grid-wrapper">
          {players.map((p) => (
            <motion.div 
              className={`glass-card ${p.hasPlayed ? 'played' : ''}`} 
              key={p.id}
              layout
            >
              <div className="card-header">
                <input 
                  className="player-input" 
                  value={p.name} 
                  onChange={(e) => handleNameChange(p.id, e.target.value)}
                />
                <div className="header-actions">
                  <button className="action-btn" onClick={() => toggleAllKillers(p.id)}>
                    {p.killers.length === KILLERS_RU.length ? "CLEAR" : "ALL"}
                  </button>
                  <button className="delete-x" onClick={() => removePlayer(p.id)}>×</button>
                </div>
              </div>
              {p.hasPlayed && <div className="played-badge">УЖЕ БЫЛ</div>}
              <div className="killer-count">KILLERS ({p.killers.length})</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* WINNER MODAL */}
      <AnimatePresence>
        {winner && (
          <motion.div 
            className="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setWinner(null)}
          >
            <motion.div 
              className="winner-box glass-card"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="winner-content">
                <div className="winner-main">
                  <div className="winner-label">ЖЕРТВА СУДЬБЫ</div>
                  <div className="winner-name">{winner.p.name}</div>
                  <div className="killer-display">{winner.k}</div>
                </div>

                {(winner.perks || winner.map || winner.mutator) && (
                  <div className="extra-info">
                    {winner.map && (
                       <div className="extra-block map-block">
                         <span>REALM</span>
                         <div>{winner.map}</div>
                       </div>
                    )}
                    {winner.mutator && (
                       <div className="extra-block mutator-block">
                         <span>CONDITION</span>
                         <div>{winner.mutator}</div>
                       </div>
                    )}
                    {winner.perks && (
                      <div className="perks-grid">
                        {winner.perks.map(perk => (
                          <div key={perk} className="perk-card">{perk}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button className="spin-btn close-btn" onClick={() => setWinner(null)}>
                ПРИНЯТЬ
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default App;