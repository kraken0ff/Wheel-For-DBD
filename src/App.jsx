import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './App.css';
import { KILLERS_RU, KILLER_SLUGS, MAPS, MUTATORS, PERKS_META, PERKS_ALL, ADDON_RARITIES } from './gameData';

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playTick = () => {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime); 
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.04);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
};

const encodeData = (data) => {
  try {
    const json = JSON.stringify(data);
    const safeString = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    });
    return btoa(safeString);
  } catch (e) {
    console.error("Encode error:", e);
    return "";
  }
};

const decodeData = (str) => {
  try {
    const originalString = atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join('');
    return JSON.parse(decodeURIComponent(originalString));
  } catch (e) {
    console.error("Decode error:", e);
    return null;
  }
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

const ResultContent = ({ data, isStreamerMode = false }) => {
  const [perksHidden, setPerksHidden] = useState(isStreamerMode);
  const [linkCopied, setLinkCopied] = useState(false);

  const copyLink = () => {
    const rawCode = encodeData(data);
    const safeUrlParam = encodeURIComponent(rawCode);
    const url = `${window.location.origin}${window.location.pathname}?data=${safeUrlParam}`;
    
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  if (!data) return <div>Данные повреждены</div>;
  
  const killerSlug = KILLER_SLUGS[data.k];
  const killerImgUrl = killerSlug ? `https://cdn.nightlight.gg/img/portraits/${killerSlug}.png` : null;

  return (
    <div className="winner-content">
      <div className="winner-main">
        {isStreamerMode && data.roundNum && <div className="winner-label">ЖЕРТВА СУДЬБЫ #{data.roundNum}</div>}
        <div className="winner-name">{data.p.name}</div>
        
        {killerImgUrl && (
          <div className="killer-portrait-container">
            <img src={killerImgUrl} alt={data.k} className="killer-portrait" />
          </div>
        )}
        
        <div className="killer-display">{data.k}</div>
      </div>

      {(data.perks || data.map || data.mutator || data.addons) && (
        <div className="extra-info">
          {data.map && (
             <div className="extra-block map-block">
               <span>КАРТА</span>
               <div>{data.map}</div>
             </div>
          )}
          
          {data.mutator && (
             <div className="extra-block mutator-block">
               <span>УСЛОВИЕ</span>
               <div>{data.mutator}</div>
             </div>
          )}

          {data.addons && (
             <div className="extra-block addons-block">
                <span>АДДОНЫ</span>
                <div className="addons-row">
                   <div className="addon-badge">{data.addons[0]}</div>
                   <div className="plus">+</div>
                   <div className="addon-badge">{data.addons[1]}</div>
                </div>
             </div>
          )}
          
          {data.perks && (
            <div className="perks-container">
              <div className="perks-header">
                <span className="perks-title">ПЕРКИ</span>
                {isStreamerMode && (
                  <button className="toggle-eye-btn" onClick={() => setPerksHidden(!perksHidden)} title="Показать/Скрыть">
                    {perksHidden ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                )}
              </div>
              <div className={`perks-grid ${perksHidden ? 'blurred' : ''}`}>
                  {data.perks.map((perk, i) => (
                    <div key={i} className="perk-card">{perk}</div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isStreamerMode && (
        <button className="share-link-btn" onClick={copyLink}>
          {linkCopied ? "СКОПИРОВАНО!" : "🔗 ССЫЛКА ДЛЯ ИГРОКА"}
        </button>
      )}
    </div>
  );
};

const App = () => {
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataStr = params.get('data');
    if (dataStr) {
      const decoded = decodeData(dataStr);
      if (decoded) {
        setPlayerData(decoded);
      } else {
        alert("Ошибка ссылки: Не удалось расшифровать данные. Попросите хоста скопировать ссылку заново.");
      }
    }
    setLoading(false);
  }, []);

  if (playerData) {
    return (
      <>
        <div className="bg-noise"></div>
        <div className="player-view-container">
          <motion.div 
            className="winner-box glass-card player-view-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 style={{textAlign: 'center', marginBottom: 20, fontSize: '0.9rem', color: '#888', letterSpacing: '2px'}}>ВАША ЗАДАЧА</h2>
            <ResultContent data={playerData} isStreamerMode={false} />
            <a href="/" className="reset-btn" style={{display:'block', textAlign:'center', marginTop: 30, textDecoration:'none'}}>
              Открыть свой рандомайзер
            </a>
          </motion.div>
        </div>
      </>
    );
  }
  
  if (loading && window.location.search.includes('data=')) {
     return <div className="bg-noise"></div>;
  }

  const [players, setPlayers] = useState(() => {
    const saved = localStorage.getItem('dbd-randomizer-players');
    return saved ? JSON.parse(saved) : Array.from({ length: 4 }, (_, i) => ({
      id: Date.now() + i,
      name: `Игрок ${i + 1}`,
      killers: [...KILLERS_RU],
      hasPlayed: false
    }));
  });

  const [settings, setSettings] = useState({
    elimination: true,
    perks: true,
    perksMode: 'meta',
    maps: true,
    mutators: false,
    addons: true
  });

  const [history, setHistory] = useState([]); 
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [viewHistoryItem, setViewHistoryItem] = useState(null);

  const activePlayers = useMemo(() => {
    if (settings.elimination) {
      return players.filter(p => !p.hasPlayed);
    }
    return players;
  }, [players, settings.elimination]);

  useEffect(() => {
    localStorage.setItem('dbd-randomizer-players', JSON.stringify(players));
  }, [players]);

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
    setHistory([]);
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const spin = () => {
    if (isSpinning || activePlayers.length === 0) return;
    
    initAudio();
    setIsSpinning(true);
    setWinner(null);

    let ticks = 0;
    const totalTime = 5000;
    
    const interval = setInterval(() => {
      ticks++;
      if (ticks % 2 === 0 || Math.random() > 0.6) {
        playTick();
      }
    }, 100);

    const spins = 5 + Math.random() * 5;
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

    const pool = winPlayer.killers.length ? winPlayer.killers : ["Нет маньяков"];
    const winKiller = pool[Math.floor(Math.random() * pool.length)];

    let result = { 
      id: Date.now(),
      roundNum: history.length + 1,
      p: winPlayer, 
      k: winKiller,
      timestamp: new Date().toLocaleTimeString().slice(0, 5)
    };
    
    if (settings.perks) {
      const source = settings.perksMode === 'meta' ? PERKS_META : PERKS_ALL;
      const shuffled = [...new Set(source)].sort(() => 0.5 - Math.random());
      result.perks = shuffled.slice(0, 4);
    }
    
    if (settings.addons) {
      const r1 = ADDON_RARITIES[Math.floor(Math.random() * ADDON_RARITIES.length)];
      const r2 = ADDON_RARITIES[Math.floor(Math.random() * ADDON_RARITIES.length)];
      result.addons = [r1, r2];
    }
    
    if (settings.maps) {
      result.map = MAPS[Math.floor(Math.random() * MAPS.length)];
    }

    if (settings.mutators) {
      result.mutator = MUTATORS[Math.floor(Math.random() * MUTATORS.length)];
    }

    if (settings.elimination) {
      setPlayers(prev => prev.map(p => p.id === winPlayer.id ? { ...p, hasPlayed: true } : p));
    }

    setWinner(result);
    setHistory(prev => [...prev, result]);
    
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

  const toggleKillerForPlayer = (playerId, killerName) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      const hasKiller = p.killers.includes(killerName);
      let newKillers;
      if (hasKiller) {
        newKillers = p.killers.filter(k => k !== killerName);
      } else {
        newKillers = [...p.killers, killerName];
      }
      return { ...p, killers: newKillers };
    }));
  };

  const toggleAllKillers = (playerId, enable) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      return { ...p, killers: enable ? [...KILLERS_RU] : [] };
    }));
  };

  return (
    <>
      <div className="bg-noise"></div>
      
      <div className="history-sidebar glass-card">
        <h3>КРУГ ИСТОРИИ</h3>
        <div className="history-list">
          {history.length === 0 && <div className="history-empty">Пока никого...</div>}
          {history.map((h) => {
            const hKillerSlug = KILLER_SLUGS[h.k];
            const hImg = hKillerSlug ? `https://cdn.nightlight.gg/img/portraits/${hKillerSlug}.png` : null;
            return (
              <div key={h.id} className="history-item" onClick={() => setViewHistoryItem(h)}>
                <span className="h-num">#{h.roundNum}</span>
                {hImg && <img src={hImg} alt="" className="h-avatar" />}
                <div className="h-info">
                  <span className="h-name">{h.p.name}</span>
                  <span className="h-killer">{h.k}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="app-container">
        <h1>DBD <span>RANDOMIZER</span> <span style={{fontSize: '1rem', verticalAlign: 'middle', opacity: 0.5}}>v9.3.0</span></h1>

        <div className="settings-panel glass-card">
          <div className="setting-group">
            <label className="switch-label">
              <input type="checkbox" checked={settings.elimination} onChange={() => toggleSetting('elimination')} />
              <span className="slider round"></span>
              <span className="label-text">Выбывание</span>
            </label>
            {settings.elimination && activePlayers.length < players.length && (
              <button className="reset-btn" onClick={resetElimination}>СБРОС КРУГА</button>
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
                 onClick={() => setSettings(s => ({...s, perksMode: s.perksMode === 'meta' ? 'chaos' : 'meta'}))}
               >
                 {settings.perksMode === 'meta' ? 'META' : 'CHAOS'}
               </button>
            )}
            <label className="switch-label">
              <input type="checkbox" checked={settings.addons} onChange={() => toggleSetting('addons')} />
              <span className="slider round"></span>
              <span className="label-text">Аддоны</span>
            </label>
          </div>

          <div className="divider"></div>

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
              <button className="reset-btn-large" onClick={resetElimination}>НОВЫЙ КРУГ</button>
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
                <button className="delete-x" onClick={() => removePlayer(p.id)}>×</button>
              </div>
              
              {p.hasPlayed && <div className="played-badge">УЖЕ БЫЛ</div>}
              
              <div className="killer-section">
                <div className="killer-count-row">
                    <span>Маньяков: <strong>{p.killers.length}</strong></span>
                    <button className="edit-killers-btn" onClick={() => setEditingPlayerId(p.id)}>
                        ⚙️ Настроить
                    </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {editingPlayerId && (
            <motion.div 
                className="overlay"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setEditingPlayerId(null)}
            >
                <motion.div 
                    className="settings-modal glass-card"
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    onClick={e => e.stopPropagation()}
                >
                    {(() => {
                        const p = players.find(pl => pl.id === editingPlayerId);
                        if (!p) return null;
                        return (
                            <>
                                <h2>Пул маньяков: {p.name}</h2>
                                <div className="modal-actions">
                                    <button className="action-btn" onClick={() => toggleAllKillers(p.id, true)}>Выбрать всех</button>
                                    <button className="action-btn" onClick={() => toggleAllKillers(p.id, false)}>Убрать всех</button>
                                </div>
                                <div className="killers-grid">
                                    {KILLERS_RU.map(killer => (
                                        <label key={killer} className={`killer-checkbox ${p.killers.includes(killer) ? 'active' : ''}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={p.killers.includes(killer)}
                                                onChange={() => toggleKillerForPlayer(p.id, killer)}
                                            />
                                            {killer}
                                        </label>
                                    ))}
                                </div>
                                <button className="spin-btn close-btn-small" onClick={() => setEditingPlayerId(null)}>ГОТОВО</button>
                            </>
                        );
                    })()}
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(winner || viewHistoryItem) && (
          <motion.div 
            className="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setWinner(null); setViewHistoryItem(null); }}
          >
            <motion.div 
              className="winner-box glass-card"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <ResultContent 
                data={winner || viewHistoryItem} 
                isStreamerMode={true} 
              />
              
              <button className="spin-btn close-btn" onClick={() => { setWinner(null); setViewHistoryItem(null); }}>
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