export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert('Não há dados para exportar');
    return;
  }

  // Obter cabeçalhos
  const headers = Object.keys(data[0]);
  
  // Criar conteúdo CSV
  let csvContent = headers.join(';') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Tratar valores especiais
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(';')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      if (value instanceof Date) {
        return value.toLocaleDateString('pt-BR');
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;
    });
    csvContent += values.join(';') + '\n';
  });

  // Adicionar BOM para UTF-8 (para Excel reconhecer acentos)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Criar link de download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportAllData = () => {
  // Recuperar todos os dados do localStorage
  const products = JSON.parse(localStorage.getItem('products') || '[]');
  const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
  const entries = JSON.parse(localStorage.getItem('entries') || '[]');
  const exits = JSON.parse(localStorage.getItem('exits') || '[]');
  const purchases = JSON.parse(localStorage.getItem('purchases') || '[]');

  // Criar um objeto com todos os dados
  const allData = {
    produtos: products,
    fornecedores: suppliers,
    entradas: entries,
    saidas: exits,
    compras: purchases,
    dataExportacao: new Date().toLocaleString('pt-BR')
  };

  // Converter para JSON e fazer download
  const dataStr = JSON.stringify(allData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `almoxarifado_completo_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};