// Script para buscar estrutura JSON dos grupos da Evolution API
const https = require('https');

const instanceKey = 'test_1e90397a_1764205808867';
const apiKey = '05F9E46B-04CD-45F2-906F-B14BC5A82E70';

// Primeiro vamos buscar a URL da instância no banco
// Como não temos acesso direto, vou usar a URL que provavelmente está configurada
const apiUrls = [
  'https://dev.evo.sistemabrasil.online'
];

async function fetchGroups(baseUrl) {
  const url = `${baseUrl}/group/fetchAllGroups/${instanceKey}?getParticipants=true`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json'
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ url: baseUrl, data: json });
        } catch (e) {
          reject(new Error(`Parse error: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
  });
}

async function main() {
  // Tentar cada URL
  for (const baseUrl of apiUrls) {
    console.log(`\nTentando: ${baseUrl}`);
    try {
      const result = await fetchGroups(baseUrl);
      console.log('\n=== SUCESSO ===');
      console.log('URL:', result.url);
      console.log('\n=== ESTRUTURA JSON COMPLETA ===\n');
      console.log(JSON.stringify(result.data, null, 2));
      return;
    } catch (error) {
      console.log(`Erro: ${error.message}`);
    }
  }

  console.log('\nNenhuma URL funcionou');
}

main();
