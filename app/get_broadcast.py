import socket
import psutil
import ipaddress

def get_broadcast_space():
    """Retourne l'adresse de broadcast du réseau local (ex: 192.168.1.255)"""
    for interface, addrs in psutil.net_if_addrs().items():
        for addr in addrs:
            if addr.family == socket.AF_INET and addr.address != '127.0.0.1':
                try:
                    ip = ipaddress.IPv4Interface(f"{addr.address}/{addr.netmask}")
                    return str(ip.network.broadcast_address)
                except Exception:
                    continue

    # Fallback
    return "255.255.255.255"

print(get_broadcast_space())