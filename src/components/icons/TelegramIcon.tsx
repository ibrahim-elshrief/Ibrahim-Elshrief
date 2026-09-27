import React from 'react';

export const TelegramIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.67c.458 0 .66-.21.916-.457l2.199-2.138 4.574 3.38c.843.464 1.45.225 1.66-.782l2.997-14.122c.307-1.23-.468-1.786-1.27-.918z" />
  </svg>
);

export default TelegramIcon;
