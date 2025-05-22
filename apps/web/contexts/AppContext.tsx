"use client";
import type React from 'react';
import { createContext, useState } from 'react';

// 定义上下文的数据类型
type AppContextType = {
    someData: string;
    setSomeData: (data: string) => void;
};

// 创建上下文对象
export const AppContext = createContext<AppContextType | null>(null);

// 创建 Provider 组件
export const AppProvider: React.FC = ({ children }) => {
    const [someData, setSomeData] = useState('');

    const value = {
        someData,
        setSomeData,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};


// import React, { createContext, useContext } from 'react';
 
// // 创建一个Context
// const ThemeContext = createContext();
 
// // 使用Provider来包裹你的组件树
// export function ThemeProvider({ children, theme }) {
//   return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
// }
 
// // 使用useContext来消费Context
// export function useTheme() {
//   return useContext(ThemeContext);
// }