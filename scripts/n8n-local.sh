#!/bin/bash

# Helper script for managing local n8n Docker instance

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_status() {
    echo -e "${GREEN}[n8n-local]${NC} $1"
}

function print_error() {
    echo -e "${RED}[n8n-local]${NC} $1"
}

function print_warning() {
    echo -e "${YELLOW}[n8n-local]${NC} $1"
}

case "$1" in
    start)
        if docker ps | grep -q n8n; then
            print_warning "n8n is already running"
            exit 0
        fi
        
        if docker ps -a | grep -q n8n; then
            print_status "Starting existing n8n container..."
            docker start n8n
        else
            print_status "Creating and starting new n8n container..."
            docker run -d \
                --name n8n \
                -p 5678:5678 \
                -v n8n_data:/home/node/.n8n \
                n8nio/n8n
        fi
        
        print_status "n8n is running at http://localhost:5678"
        ;;
        
    stop)
        print_status "Stopping n8n..."
        docker stop n8n || print_warning "n8n was not running"
        ;;
        
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        if docker ps | grep -q n8n; then
            print_status "n8n is running"
            docker ps | grep n8n
        else
            print_warning "n8n is not running"
        fi
        ;;
        
    logs)
        print_status "Showing n8n logs (Ctrl+C to exit)..."
        docker logs -f n8n
        ;;
        
    remove)
        print_warning "This will remove the n8n container (but preserve data)"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker stop n8n 2>/dev/null || true
            docker rm n8n
            print_status "n8n container removed. Data is preserved in n8n_data volume."
        fi
        ;;
        
    clean)
        print_error "This will remove n8n container AND all data!"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker stop n8n 2>/dev/null || true
            docker rm n8n 2>/dev/null || true
            docker volume rm n8n_data 2>/dev/null || true
            print_status "n8n completely removed."
        fi
        ;;
        
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|remove|clean}"
        echo
        echo "Commands:"
        echo "  start    - Start n8n container"
        echo "  stop     - Stop n8n container"
        echo "  restart  - Restart n8n container"
        echo "  status   - Show n8n status"
        echo "  logs     - Show n8n logs (live)"
        echo "  remove   - Remove container (keeps data)"
        echo "  clean    - Remove container AND data"
        exit 1
        ;;
esac 