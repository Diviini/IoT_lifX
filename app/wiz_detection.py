# from pywizlight.discovery import discover_lights
# import asyncio

async def discover():
    bulbs = await discover_lights(broadcast_space="192.168.12.255")  # adapte au broadcast de ton réseau
    for bulb in bulbs:
        print(f"IP: {bulb.ip}, MAC: {bulb}")

asyncio.run(discover())