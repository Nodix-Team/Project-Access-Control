#ifndef PIN_CONFIG_H
#define PIN_CONFIG_H

// Pilih salah satu target board yang aktif:
#define BOARD_TARGET_PROTOTYPE_WROOM32D_38PIN  // <- Aktif untuk Prototyping Lab (ESP32-WROOM-32D 38-Pin)
// #define BOARD_TARGET_PRODUCTION_ESP32S3_N16 // <- Aktif untuk PCB Produksi (Ref: KEPUTUSAN_ARSITEKTUR_v0.3.md §1.1)

#ifdef BOARD_TARGET_PROTOTYPE_WROOM32D_38PIN
  // === MAPPING PIN PROTOTYPING BREADBOARD (ESP32-WROOM-32D 38-PIN) ===
  #define PIN_ETH_SPI_CS      5
  #define PIN_ETH_SPI_SCK    18
  #define PIN_ETH_SPI_MISO   19
  #define PIN_ETH_SPI_MOSI   23
  #define PIN_ETH_RST        33

  #define PIN_RTC_I2C_SDA    21
  #define PIN_RTC_I2C_SCL    22

  #define PIN_WIEGAND_D0      4
  #define PIN_WIEGAND_D1     15  // Disediakan di GPIO15 (terpisah dari SPI)

  #define PIN_RELAY_1        16
  #define PIN_RELAY_2        17
  #define PIN_RELAY_3        25
  #define PIN_RELAY_4        26

  #define PIN_REX_1          13  // Request to Exit Button untuk Pintu 1

  #define PIN_LED_GREEN      12  // Granted Status LED
  #define PIN_LED_RED        14  // Denied/Alarm Status LED

  #define PIN_SENS_MAINS_LOST 27  // (Dipindah dari 1/TX0) Digital Input PLN Fail
  #define PIN_SENS_POWER_LOW  34  // (Dipindah dari 2/Strapping) ADC1 Battery Drop
  #define PIN_BTN_WEB_AP     32  // Hotspot Portal Button

#elif defined(BOARD_TARGET_PRODUCTION_ESP32S3_N16)
  // === MAPPING PIN PCB PRODUKSI FINAL (ESP32-S3 REF: KEPUTUSAN_ARSITEKTUR_v0.3.md §1.1) ===
  #define PIN_ETH_SPI_CS     10
  #define PIN_ETH_SPI_SCK    12
  #define PIN_ETH_SPI_MOSI   11
  #define PIN_ETH_SPI_MISO   13
  #define PIN_ETH_RST         9

  #define PIN_RTC_I2C_SDA     8
  #define PIN_RTC_I2C_SCL     9

  #define PIN_WIEGAND_D0      4
  #define PIN_WIEGAND_D1     48  // Ref: §1.1

  #define PIN_RELAY_1        33  // Ref: §1.1
  #define PIN_RELAY_2        40  // Ref: §1.1
  #define PIN_RELAY_3        41
  #define PIN_RELAY_4        42

  #define PIN_REX_1          47  // Contoh pin untuk REX di ESP32-S3

  #define PIN_LED_GREEN      38
  #define PIN_LED_RED        39

  #define PIN_SENS_MAINS_LOST 1  // Ref: §1.1 Digital Input
  #define PIN_SENS_POWER_LOW  2  // Ref: §1.1 ADC Battery Drop
  #define PIN_BTN_WEB_AP     37  // Ref: §0.2
#endif

#endif // PIN_CONFIG_H
