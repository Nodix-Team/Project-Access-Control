#ifndef WIEGAND_READER_H
#define WIEGAND_READER_H

#include <Arduino.h>

class WiegandReader {
public:
    WiegandReader(uint8_t pinD0, uint8_t pinD1);
    
    // Harus dipanggil di setup()
    void begin();
    
    // Harus dipanggil di loop() untuk mengecek apakah ada kartu yang selesai dibaca
    bool available();
    
    // Mendapatkan UID kartu yang terbaca dalam format desimal string (contoh: "12345678")
    String getCardUID();

    // Fungsi internal untuk interrupt, jangan dipanggil manual
    void IRAM_ATTR addBit(uint8_t bit);

private:
    uint8_t _pinD0;
    uint8_t _pinD1;
    
    volatile unsigned long _cardTemp;
    volatile uint8_t _bitCount;
    volatile unsigned long _lastPulseTime;
    
    unsigned long _cardUid;
    bool _isDataReady;
};

#endif
