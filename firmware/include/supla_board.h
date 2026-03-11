#ifndef SUPLA_BOARD_H
#define SUPLA_BOARD_H

#define SUPLA_BOARD_NAME "CB3S"
#define SUPLA_SOC_NAME "BK7231N"
#define SUPLA_CPU_FREQ_MHZ 120
#define SUPLA_FLASH_BYTES (2 * 1024 * 1024)
#define SUPLA_RAM_BYTES (256 * 1024)

#define SUPLA_PIN_UART_RX 10
#define SUPLA_PIN_UART_TX 11
#define SUPLA_PIN_LED 8
#define SUPLA_PIN_BUTTON 7
#define SUPLA_PIN_RELAY 24

static inline const char *supla_board_summary(void) {
  return "CB3S/BK7231N, 2MiB flash, 256KiB RAM, OTA-ready flash map";
}

#endif
