from lifxlan import LifxLAN

lifx = LifxLAN()
devices = lifx.get_lights()

print("Lampe(s) détectée(s) :", devices)
for d in devices:
    print("Nom :", d.get_label(), "| Adresse MAC :", d.mac_addr)

