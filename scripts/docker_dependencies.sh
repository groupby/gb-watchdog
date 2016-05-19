#!/usr/bin/env bash
docker rm -f es-watchdog
docker pull elasticsearch:2.3
docker run -d --name es-watchdog -p 9200:9200 elasticsearch:2.3