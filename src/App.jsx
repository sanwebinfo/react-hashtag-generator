import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import Fuse from 'fuse.js';
import { X, Copy, Check } from '@phosphor-icons/react';
import './App.css';
import 'bulma/css/bulma.min.css';

const MAX_HASHTAGS = 30;
const COLOR_CLASSES = ['has-background-blue', 'has-background-green', 'has-background-purple', 'has-background-orange', 'has-background-pink'];
const HASHTAG_API = '/hashtags.json';

const App = () => {
  const [inputText, setInputText] = useState(localStorage.getItem('hashtagInput') || '');
  const [hashtags, setHashtags] = useState(() => JSON.parse(localStorage.getItem('hashtags') || '[]'));
  const [notification, setNotification] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(-1);
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
  const [data, setData] = useState([]);
  const dataRef = useRef([]);

  useEffect(() => {
    const fetchHashtags = async () => {
      try {
        const response = await fetch(HASHTAG_API);
        const fetchedData = await response.json();
        if (Array.isArray(fetchedData)) {
          const formattedData = fetchedData.map(tag => ({ tag }));
          dataRef.current = formattedData;
          setData(formattedData);
        }
      } catch (error) {
        console.error('Error fetching hashtags:', error);
      }
    };
    fetchHashtags();
  }, []);

  const fuse = useMemo(() => {
    if (data.length > 0) {
      return new Fuse(data, { includeScore: true, threshold: 0.2, distance: 30, keys: ['tag'] });
    }
    return null;
  }, [data]);

  const processHashtags = useCallback((text) => {
    return text
      .split(/[,\s]+/)
      .map(part => DOMPurify.sanitize(part.trim()))
      .filter(tag => tag.length > 0)
      .slice(0, MAX_HASHTAGS)
      .map(tag => `#${tag}`);
  }, []);

  useEffect(() => {
    localStorage.setItem('hashtagInput', inputText);
    localStorage.setItem('hashtags', JSON.stringify(hashtags));
  }, [inputText, hashtags]);

  useEffect(() => {
    setHashtags(processHashtags(inputText));
  }, [inputText, processHashtags]);

  useEffect(() => {
    const processed = processHashtags(inputText);
    if (processed.length > MAX_HASHTAGS) {
      setNotification({ message: `Instagram allows maximum ${MAX_HASHTAGS} hashtags!`, type: 'is-warning' });
    }
    setHashtags(processed.slice(0, MAX_HASHTAGS));
  }, [inputText, processHashtags]);

  const getLastTypedHashtag = (text) => {
    const match = text.match(/#?(\w+)$/);
    return match ? match[1] : '';
  };

  useEffect(() => {
    if (!fuse) return setHashtagSuggestions([]);

    const lastTypedHashtag = getLastTypedHashtag(inputText);
    if (!lastTypedHashtag) return setHashtagSuggestions([]);

    setHashtagSuggestions(fuse.search(lastTypedHashtag, { limit: 5 }).map(res => res.item.tag));
  }, [inputText, fuse]);

  const copyToClipboard = async (text, index = -1) => {
    const finalText = index === -1 ? hashtags.join(' ') : text;
    if (!finalText) {
      setNotification({ message: 'Nothing to copy', type: 'is-danger' });
      return;
    }

    try {
      await navigator.clipboard.writeText(finalText);
      setNotification({ message: `Copied ✅`, type: 'has-background-dark' });
      if (index !== -1) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(-1), 1000);
      }
    } catch {
      setNotification({ message: 'Failed to copy', type: 'is-danger' });
    }
  };

  const deleteHashtag = (index) => {
    const newHashtags = [...hashtags];
    const deletedTag = newHashtags.splice(index, 1)[0].slice(1);
    setHashtags(newHashtags);

    const newInput = inputText
      .split(/[,\s]+/)
      .filter(tag => tag.trim() !== deletedTag)
      .join(' ');
    setInputText(newInput);
  };

  const replaceLastTypedHashtag = (selectedTag) => {
    const words = inputText.split(/\s+/);
    words[words.length - 1] = `${selectedTag}`;
    setInputText(words.join(' ') + ' ');
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 2100);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <section className="section mt-2 mb-4" style={{ minHeight: '100vh' }}>
      <div className="container">
        <div className="columns is-centered">
          <div className="column is-two-thirds">
            <div className="box" style={{ borderRadius: '16px', background: '#ffffff', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)', border: '1px solid rgba(0, 0, 0, 0.05)' }}>
              <div className="field">
                <label className="label has-text-dark mb-5 mt-4">#️⃣ Enter Text (separate with spaces or commas)</label>
                <div className="control">
                  <textarea
                    className="textarea is-warning"
                    placeholder="Enter Text (separate with spaces or commas)"
                    value={inputText}
                    rows="10"
                    onChange={(e) => setInputText(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                    style={{ 
                      minHeight: '160px',
                      borderColor: '#dee2e6',
                      fontWeight: '600',
                      boxShadow: 'none',
                      resize: 'vertical',
                      fontSize: '1rem',
                      lineHeight: '1.6',
                      padding: '1.28rem'
                    }}
                  />
                </div>
              </div>

              {hashtagSuggestions.length > 0 && (
                <div className="field mt-6 mb-5">
                  <label className="label has-text-dark">🔍 Suggested Hashtags</label>
                  <div className="tags are-medium">
                    {hashtagSuggestions.map((tag, index) => (
                      <span key={index} className="tag is-info is-light" onClick={() => replaceLastTypedHashtag(tag)}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="field mt-6">
              <label className="label has-text-dark">
                 🏷️ Generated Hashtags ({hashtags.length}/{MAX_HASHTAGS})
               {hashtags.length >= MAX_HASHTAGS && (
                  <span className="has-text-danger ml-2">
                    (Maximum limit reached)
                 </span>
                )}
              </label>
                <div className="tags are-medium" style={{ 
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  minHeight: '100px',
                  padding: '0.5rem 0'
                }}>
                  {hashtags.map((tag, index) => (
                    <div
                      key={index}
                      className={`tag ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`}
                      style={{ 
                        borderRadius: '5px',
                        fontWeight: '700',
                        padding: '1rem 1.5rem',
                        position: 'relative',
                        transition: 'all 0.3s ease',
                        color: '#ffffff',
                        fontSize: '0.90rem',
                        paddingRight: '3rem'
                      }}
                    >
                      <span
                        className="is-flex is-align-items-center gap-1"
                        onClick={() => copyToClipboard(tag, index)}
                        style={{ cursor: 'pointer' }}
                      >
                        {copiedIndex === index ? (
                          <Check size={16} weight="bold" color="#ffffff" />
                        ) : (
                          <Copy size={16} weight="bold" color="#ffffff" />
                        )}&nbsp;
                        <span className="has-text-weight-medium">{tag}</span>
                      </span>
                      
                      <button
                        className="delete is-small"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteHashtag(index)
                        }}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          right: '0.75rem',
                          transform: 'translateY(-50%)',
                          background: 'rgba(255,255,255,0.3)',
                          borderRadius: '50%',
                          width: '1.5rem',
                          height: '1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        aria-label="Delete hashtag"
                      >
                        <X size={14} weight="bold" color="#ffffff" />
                      </button>
                    </div>
                  ))}

                  {hashtags.length === 0 && (
                    <p className="has-text-grey-600">
                      Your generated hashtags will appear here...
                    </p>
                  )}
                </div>
              </div>

              <div className="field">
                <div className="control">
                  <button
                    className={`button mb-5 mt-5 is-rounded ${hashtags.length > 0 ? 'has-button' : 'is-static'}`}
                    onClick={() => copyToClipboard()}
                    disabled={hashtags.length === 0}
                    style={{
                      fontWeight: '700',
                      letterSpacing: '0.25px',
                      transition: 'all 0.3s ease',
                      border: 'none',
                      height: '3rem',
                      fontSize: '0.90rem'
                    }}
                  >
                    📋 Copy All Hashtags
                  </button>
                </div>
              </div>
            </div>

            {notification && (
              <div 
                className={`notification ${notification.type}`} 
                style={{ 
                  position: 'fixed',
                  top: '30px',
                  right: '30px',
                  borderRadius: '15px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '2.2rem',
                  padding: '1.5rem 1.80rem',
                  width: 'auto',
                  maxWidth: 'calc(100% - 50px)',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <span className="has-text-weight-medium" style={{ flex: 1 }}>
                  {notification.message}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default App;
