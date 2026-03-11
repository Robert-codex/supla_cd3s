#ifndef LIBRETINY_COMPAT_H_
#define LIBRETINY_COMPAT_H_

#if defined(SUPLA_LIBRETINY) && !defined(microsecondsToClockCycles)
#define microsecondsToClockCycles(a) ((a) * (F_CPU / 1000000L))
#endif

#endif
