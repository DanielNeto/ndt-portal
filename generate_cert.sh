#!/bin/bash

install -d certs

openssl genrsa -out wildcardNovo_rnp.br.key
openssl req -new -x509 -key wildcardNovo_rnp.br.key -out wildcardNovo_rnp.br.crt -days 2 -subj "/C=XX/ST=State/L=Locality/O=Org/OU=Unit/CN=localhost/emailAddress=test@email.address"
mv wildcardNovo_rnp.br.key wildcardNovo_rnp.br.crt certs/
