#include "WiegandReader.h"

// ISR Router Functions
void IRAM_ATTR isrD0(void* arg) {
    static_cast<WiegandReader*>(arg)->addBit(0);
}

void IRAM_ATTR isrD1(void* arg) {
    static_cast<WiegandReader*>(arg)->addBit(1);
}

WiegandReader::WiegandReader(uint8_t pinD0, uint8_t pinD1) 
    : _pinD0(pinD0), _pinD1(pinD1), _cardTemp(0), _bitCount(0), _lastPulseTime(0), _cardUid(0), _isDataReady(false) {}

void WiegandReader::begin() {
    pinMode(_pinD0, INPUT_PULLUP);
    pinMode(_pinD1, INPUT_PULLUP);

    attachInterruptArg(digitalPinToInterrupt(_pinD0), isrD0, this, FALLING);
    attachInterruptArg(digitalPinToInterrupt(_pinD1), isrD1, this, FALLING);
}

void IRAM_ATTR WiegandReader::addBit(uint8_t bit) {
    _cardTemp <<= 1;
    _cardTemp |= bit;
    _bitCount++;
    _lastPulseTime = millis();
}

bool WiegandReader::available() {
    // Jika tidak ada bit yang ditambahkan dalam 25ms terakhir, berarti transmisi selesai
    if (_bitCount > 0 && (millis() - _lastPulseTime > 25)) {
        
        // Cek format (Wiegand 26-bit atau 34-bit)
        if (_bitCount == 26) {
            // Hilangkan bit parity pertama dan terakhir
            _cardTemp = (_cardTemp >> 1) & 0x00FFFFFF;
            _cardUid = _cardTemp;
            _isDataReady = true;
        } 
        else if (_bitCount == 34) {
            // Hilangkan bit parity pertama dan terakhir
            _cardTemp = (_cardTemp >> 1) & 0xFFFFFFFF;
            _cardUid = _cardTemp;
            _isDataReady = true;
        } 
        else {
            // Format tidak didukung / error pembacaan
            _isDataReady = false;
        }

        // Reset untuk pembacaan berikutnya
        _cardTemp = 0;
        _bitCount = 0;
    }
    
    return _isDataReady;
}

String WiegandReader::getCardUID() {
    _isDataReady = false; // Reset flag setelah dibaca
    return String(_cardUid);
}
