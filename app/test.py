from lifxlan import LifxLAN
import time

lifx = LifxLAN()
devices = lifx.get_lights()

print("Lampe(s) détectée(s) :", devices)
for device in devices:
    print("Adresse IP :", device.get_mac_addr())
    print("Adresse MAC :", device.get_ip_addr())

lifx = LifxLAN()
lights = lifx.get_lights()

if lights:
    lamp = lights[0]
    print("Lampe détectée :", lamp.get_label())

    # Allumer la lampe
    lamp.set_power("on")

    # Diminuer l’intensité progressivement
    brightness_levels = [65535, 50000, 30000, 15000, 5000, 0]


    lamp.set_color([0, 0, 30000, 3500], rapid=True)

    time.sleep(2)

    # Éteindre à la fin
    lamp.set_power("off")

else:
    print("Aucune lampe détectée.")