#!/bin/bash

# Script para corrigir o problema do Coolify Helper
# Execute no servidor do Coolify via terminal

echo "🔧 Fixing Coolify Helper Issue..."
echo ""

# 1. Fazer login no GitHub Container Registry (público, não precisa de autenticação)
echo "📦 Pulling Coolify Helper image..."
docker pull ghcr.io/coollabsio/coolify-helper:1.0.12

if [ $? -eq 0 ]; then
    echo "✅ Helper image pulled successfully!"
else
    echo "❌ Failed to pull helper image. Trying alternative method..."

    # Alternativa: Tentar com diferentes DNS
    echo "🔄 Configuring DNS..."
    echo "nameserver 8.8.8.8" > /etc/resolv.conf
    echo "nameserver 1.1.1.1" >> /etc/resolv.conf

    # Reiniciar Docker
    echo "🔄 Restarting Docker..."
    systemctl restart docker
    sleep 5

    # Tentar novamente
    echo "📦 Retrying pull..."
    docker pull ghcr.io/coollabsio/coolify-helper:1.0.12
fi

# 2. Verificar se a imagem está disponível
echo ""
echo "🔍 Checking if image is available..."
docker images | grep coolify-helper

echo ""
echo "✅ Done! Try deploying again in Coolify."
