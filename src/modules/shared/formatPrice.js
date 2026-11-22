const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

export const formatPrice = (amount) => formatter.format(amount);
