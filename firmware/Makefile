CC := gcc
CFLAGS := -std=c11 -Wall -Wextra -pedantic -Iinclude
BUILD_DIR := build
TARGET := $(BUILD_DIR)/supla_cb3s_sim
SOURCES := src/main.c

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(SOURCES) include/supla_board.h | $(BUILD_DIR)
	$(CC) $(CFLAGS) $(SOURCES) -o $(TARGET)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

clean:
	rm -rf $(BUILD_DIR)
