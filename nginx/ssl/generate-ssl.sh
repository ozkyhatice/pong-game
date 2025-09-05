#!/bin/bash

DOMAIN="pong.42.fr"
COUNTRY="TR"
CITY="Istanbul"
ORG="Pong Game"

echo "Generating SSL certificate for $DOMAIN..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout key.pem \
    -out cert.pem \
    -subj "/C=$COUNTRY/L=$CITY/O=$ORG/CN=$DOMAIN"

echo "SSL certificate generated"