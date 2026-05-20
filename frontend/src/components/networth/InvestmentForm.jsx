import { useState, useEffect, useRef } from 'react';
import Modal from '../shared/Modal';
import useInvestmentStore from '../../store/investmentStore';
import api from '../../services/api';
 
// Market derived from ticker suffix — must match backend detectMarket()
function detectMarket(ticker) {
  if (!ticker) return null;
  const t = ticker.toUpperCase();
  if (t.endsWith('.SI')) return { key: 'SGX',  label: 'SGX',  flag: '🇸🇬', currency: 'SGD' };
  if (t.endsWith('.L'))  return { key: 'LSE',  label: 'LSE',  flag: '🇬🇧', currency: 'GBP' };
  if (t.endsWith('.HK')) return { key: 'HKEX', label: 'HKEX', flag: '🇭🇰', currency: 'HKD' };
  if (t.endsWith('.AX')) return { key: 'ASX',  label: 'ASX',  flag: '🇦🇺', currency: 'AUD' };
  return { key: 'US', label: 'US (NYSE/NASDAQ)', flag: '🇺🇸', currency: 'USD' };
}
 
export default function InvestmentForm({ investment, onClose }) {
  const { addInvestment, updateInvestment } = useInvestmentStore();
  const isEdit = Boolean(investment);
 
  // Form state
  const [ticker,        setTicker]        = useState(investment?.ticker  || '');
  const [selectedName,  setSelectedName]  = useState(investment?.name    || '');
  const [shares,        setShares]        = useState(investment?.shares  ?? '');
  const [avgCost,       setAvgCost]       = useState(investment?.avgCost ?? '');
  const [tickerLocked,  setTickerLocked]  = useState(isEdit);  // once picked from dropdown, lock it
 
  // Dropdown state
  const [query,         setQuery]         = useState(investment?.ticker  || '');
  const [suggestions,   setSuggestions]   = useState([]);
  const [searching,     setSearching]     = useState(false);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
 
  // Submission state
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');
 
  const debounceRef  = useRef(null);
  const wrapperRef   = useRef(null);
 
  const market = detectMarket(ticker);
 
  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
 
  // Debounced search as user types
  useEffect(() => {
    if (tickerLocked || query.trim().length < 1) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
 
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/investments/search', { params: { q: query } });
        const results = res.data.data || [];
        setSuggestions(results);
        setDropdownOpen(results.length > 0);
      } catch {
        setSuggestions([]);
        setDropdownOpen(false);
      } finally {
        setSearching(false);
      }
    }, 300);
 
    return () => clearTimeout(debounceRef.current);
  }, [query, tickerLocked]);
 
  const handleQueryChange = (e) => {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    // If user edits the field after picking, unlock so they can search again
    if (tickerLocked) {
      setTickerLocked(false);
      setTicker('');
      setSelectedName('');
    }
  };
 
  const handleSelectSuggestion = (item) => {
    setTicker(item.symbol);
    setSelectedName(item.shortName || item.symbol);
    setQuery(item.symbol);
    setTickerLocked(true);
    setDropdownOpen(false);
    setSuggestions([]);
    setError('');
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
 
    if (!tickerLocked && !isEdit) {
      setError('Please select a ticker from the dropdown — do not type a custom value.');
      return;
    }
    if (!ticker) {
      setError('A ticker symbol is required.');
      return;
    }
    if (!shares || isNaN(shares) || Number(shares) <= 0) {
      setError('Shares must be a positive number.');
      return;
    }
    if (!avgCost || isNaN(avgCost) || Number(avgCost) <= 0) {
      setError('Average cost must be a positive number.');
      return;
    }
 
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateInvestment(investment.id, { name: selectedName, shares, avgCost });
      } else {
        await addInvestment({ ticker, name: selectedName, shares, avgCost });
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
 
  return (
    <Modal
      title={isEdit ? 'Edit Holding' : 'Add Holding'}
      onClose={onClose}
      centerInContent
    >
      {error && (
        <div className="mb-4 px-4 py-3 bg-red/10 border border-red/30 rounded-xl text-red text-sm">
          {error}
        </div>
      )}
 
      <form onSubmit={handleSubmit} className="space-y-4">
 
        {/* Ticker search */}
        <div ref={wrapperRef} className="relative">
          <label className="label">Ticker Symbol</label>
 
          {isEdit ? (
            /* In edit mode — ticker is fixed, show as static badge */
            <div className="input flex items-center gap-2 cursor-not-allowed opacity-70 select-none">
              {market && <span>{market.flag}</span>}
              <span className="font-mono font-semibold text-accent-light">{ticker}</span>
              <span className="text-text-muted text-xs ml-1">({market?.currency})</span>
            </div>
          ) : (
            <>
              <div className="relative">
                <input
                  type="text"
                  className={`input font-mono pr-10 ${tickerLocked ? 'border-green/40 bg-green/5' : ''}`}
                  placeholder="Type to search e.g. AAPL, D05.SI, 0700.HK"
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => suggestions.length > 0 && setDropdownOpen(true)}
                  autoComplete="off"
                  spellCheck={false}
                />
                {/* Status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searching && (
                    <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  )}
                  {tickerLocked && !searching && (
                    <span className="text-green text-sm">✓</span>
                  )}
                </div>
              </div>
 
              {/* Dropdown */}
              {dropdownOpen && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                  {suggestions.map((item, i) => {
                    const mkt = detectMarket(item.symbol);
                    return (
                      <button
                        key={item.symbol + i}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(item); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface text-left transition-colors border-b border-border last:border-0"
                      >
                        <span className="text-base flex-shrink-0">{mkt?.flag || '🌐'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-accent-light text-sm">{item.symbol}</span>
                            <span className="text-xs text-text-muted bg-surface px-1.5 py-0.5 rounded">
                              {mkt?.currency || 'USD'}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary truncate">{item.shortName}</p>
                        </div>
                        <span className="text-xs text-text-muted flex-shrink-0">{item.exchange}</span>
                      </button>
                    );
                  })}
                </div>
              )}
 
              {/* No results hint */}
              {query.length >= 2 && !searching && !dropdownOpen && !tickerLocked && (
                <p className="text-xs text-text-muted mt-1.5">
                  No matches found. Try the full ticker e.g. <span className="font-mono">D05.SI</span> for SGX stocks.
                </p>
              )}
            </>
          )}
 
          {/* Market badge shown once a ticker is selected */}
          {tickerLocked && market && (
            <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg w-fit">
              <span className="text-sm">{market.flag}</span>
              <span className="text-xs text-text-secondary">{market.label}</span>
              <span className="text-xs font-mono text-text-muted">· {market.currency}</span>
            </div>
          )}
        </div>
 
        {/* Shares and Avg Cost */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Shares Held</label>
            <input
              type="number"
              className="input font-mono"
              placeholder="0.0000"
              value={shares}
              onChange={e => setShares(e.target.value)}
              step="0.0001"
              min="0.0001"
              required
            />
          </div>
          <div>
            <label className="label">
              Avg. Cost / Share
              {market && <span className="ml-1 text-text-muted normal-case font-normal">({market.currency})</span>}
            </label>
            <input
              type="number"
              className="input font-mono"
              placeholder="0.00"
              value={avgCost}
              onChange={e => setAvgCost(e.target.value)}
              step="0.01"
              min="0.01"
              required
            />
          </div>
        </div>
 
        {/* Hint about avg cost currency */}
        {market && market.key !== 'SGX' && (
          <p className="text-xs text-text-muted -mt-1">
            Enter average cost in <span className="font-mono text-accent-light">{market.currency}</span> — the app will convert to SGD for portfolio totals.
          </p>
        )}
 
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={submitting || (!isEdit && !tickerLocked)}
          >
            {submitting ? 'Saving…' : isEdit ? 'Update' : 'Add Holding'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
