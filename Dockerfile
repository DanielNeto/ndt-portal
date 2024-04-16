FROM nginx
COPY dist/ndt-portal/* /usr/share/nginx/html/
COPY nginx/default /etc/nginx/sites-available/
COPY nginx/nginx.conf /etc/nginx/
