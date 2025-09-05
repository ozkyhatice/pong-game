#!/bin/bash

DOMAIN="pong.42.fr"
COUNTRY="TR"
STATE="Istanbul"
CITY="Istanbul"
ORG="Pong Game"
OU="Development"

echo "Generating SSL certificate for $DOMAIN..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout key.pem \
    -out cert.pem \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$DOMAIN"

echo "SSL certificate generated:"
echo "- cert.pem (certificate)"
echo "- key.pem (private key)"