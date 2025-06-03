from lifxlan import LifxLAN

lifx = LifxLAN()
devices = lifx.get_lights()

print("Lampe(s) détectée(s) :", devices)
for device in devices:
    print("Adresse IP :", device.get_mac_addr())
    print("Adresse MAC :", device.get_ip_addr())

