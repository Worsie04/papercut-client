// Debug environment variable in config
console.log('Config NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://papercut-backend-container.ambitiousmoss-ff53d51e.centralus.azurecontainerapps.io/api/v1';

console.log('Config API_URL final value:', API_URL); 