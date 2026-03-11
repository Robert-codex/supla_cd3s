#include <stdio.h>
#include "supla_board.h"

int main(void) {
  printf("Supla firmware skeleton\n");
  printf("Board: %s\n", SUPLA_BOARD_NAME);
  printf("SoC: %s\n", SUPLA_SOC_NAME);
  printf("CPU: %d MHz\n", SUPLA_CPU_FREQ_MHZ);
  printf("Flash: %d bytes\n", SUPLA_FLASH_BYTES);
  printf("RAM: %d bytes\n", SUPLA_RAM_BYTES);
  printf("Default relay pin: P%d\n", SUPLA_PIN_RELAY);
  printf("Default button pin: P%d\n", SUPLA_PIN_BUTTON);
  printf("Default LED pin: P%d\n", SUPLA_PIN_LED);
  printf("UART: RX=P%d TX=P%d\n", SUPLA_PIN_UART_RX, SUPLA_PIN_UART_TX);
  printf("Summary: %s\n", supla_board_summary());
  return 0;
}
