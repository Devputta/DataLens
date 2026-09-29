import React, { createContext, useContext, useState, useEffect } from 'react';

export type CurrencyType = 'USD' | 'INR';

interface CurrencyContextType {
  currency: CurrencyType;
  setCurrency: (c: CurrencyType) => void;
  currencySymbol: string;
  useKFormat: boolean;
  setUseKFormat: (useK: boolean) => void;
  toggleUseKFormat: () => void;
  formatAmount: (
    val: number,
    format?: 'currency' | 'number' | 'percentage' | 'integer'
  ) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
  currencySymbol: '$',
  useKFormat: true,
  setUseKFormat: () => {},
  toggleUseKFormat: () => {},
  formatAmount: () => '',
});

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyType>(() => {
    const saved = localStorage.getItem('datalens_currency') as CurrencyType;
    return saved === 'INR' || saved === 'USD' ? saved : 'USD';
  });

  const [useKFormat, setUseKFormatState] = useState<boolean>(() => {
    const saved = localStorage.getItem('datalens_use_k');
    return saved !== null ? saved === 'true' : true;
  });

  const setCurrency = (c: CurrencyType) => {
    setCurrencyState(c);
    localStorage.setItem('datalens_currency', c);
  };

  const setUseKFormat = (useK: boolean) => {
    setUseKFormatState(useK);
    localStorage.setItem('datalens_use_k', String(useK));
  };

  const toggleUseKFormat = () => {
    setUseKFormat(!useKFormat);
  };

  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const formatAmount = (
    val: number,
    format: 'currency' | 'number' | 'percentage' | 'integer' = 'number'
  ): string => {
    if (isNaN(val) || val === null || val === undefined) return '—';

    const absVal = Math.abs(val);

    if (format === 'percentage') {
      return `${val >= 0 ? '' : '-'}${absVal.toFixed(1)}%`;
    }

    const prefix = format === 'currency' ? currencySymbol : '';

    let formatted = '';
    if (useKFormat) {
      if (absVal >= 1_000_000_000) {
        formatted = `${(val / 1_000_000_000).toFixed(2)}B`;
      } else if (absVal >= 1_000_000) {
        formatted = `${(val / 1_000_000).toFixed(2)}M`;
      } else if (absVal >= 1_000) {
        formatted = `${(val / 1_000).toFixed(1)}k`;
      } else if (format === 'integer' || Number.isInteger(val)) {
        formatted = Math.round(val).toLocaleString();
      } else {
        formatted = val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
      }
    } else {
      // Full standard formatting without 'k' truncation
      if (format === 'integer' || Number.isInteger(val)) {
        formatted = Math.round(val).toLocaleString();
      } else {
        formatted = val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    }

    return `${prefix}${formatted}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        currencySymbol,
        useKFormat,
        setUseKFormat,
        toggleUseKFormat,
        formatAmount,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
