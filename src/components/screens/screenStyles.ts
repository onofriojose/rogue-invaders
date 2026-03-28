export const screenFontFamily = "'Courier New', Courier, monospace";

export const btnStyle = (color: string, size: 'small' | 'large' = 'large') => ({
    background: 'transparent',
    color,
    border: `2px solid ${color}`,
    padding: size === 'large' ? '15px 40px' : '10px 20px',
    fontSize: size === 'large' ? '24px' : '16px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    boxShadow: `0 0 10px ${color}`,
    borderRadius: '8px',
    fontFamily: screenFontFamily,
    textShadow: `0 0 5px ${color}`,
    transition: 'all 0.2s',
    textTransform: 'uppercase' as const
});
