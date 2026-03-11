#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// BK7231N FreeRTOS port exposes ISR masking only as macros/inlines.
// OneWire and DHT expect these linker symbols on some embedded targets.
uint32_t ulPortSetInterruptMask(void) {
  volatile uint32_t *const interruptMaskRegister =
      (volatile uint32_t *)(0x00802000 + 17 * 4);
  const uint32_t savedValue = *interruptMaskRegister;
  *interruptMaskRegister = 0;
  return savedValue;
}

void vPortClearInterruptMask(uint32_t savedMaskValue) {
  volatile uint32_t *const interruptMaskRegister =
      (volatile uint32_t *)(0x00802000 + 17 * 4);
  *interruptMaskRegister = savedMaskValue;
}

#ifdef __cplusplus
}
#endif
