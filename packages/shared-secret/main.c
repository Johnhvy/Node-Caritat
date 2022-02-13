#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

typedef struct
{
    uint8_t shareHolders;
    uint8_t neededParts;
    uint8_t chunkSize;
    uint8_t index;
    uint8_t *data;
} CompressedKey;

typedef struct
{
    uint8_t shareHolders;
    uint8_t neededParts;
    uint8_t chunkSize;
    uint8_t index;
    uint8_t *data;
} Key;

int int_pow(int base, int exp)
{
    int result = 1;
    for (;;)
    {
        if (exp & 1)
            result *= base;
        exp >>= 1;
        if (!exp)
            break;
        base *= base;
    }

    return result;
}

void getBaseDecompositionFromNumber(int number, int base, int bufferSize, int *digitBuffer)
{
    for (int i = bufferSize; i > 0; i--)
    {
        int mod = number % base;
        digitBuffer[i - 1] = mod;
        number = number / base;
    }
}

int getNumberFromBaseDecomposition(int base, int bufferSize, int *digitBuffer)
{
    int a = 1;
    int s = 0;
    for (int i = bufferSize; i > 0; i--)
    {
        s += a * digitBuffer[i - 1];
        a *= base;
    }
    return s;
}

void getDecompressedCoordinatesDigits(int index, int bufferSize, int *digitBuffer)
{
    for (int i = 0; i < bufferSize; i++)
    {
        if (digitBuffer[i] >= index)
            digitBuffer[i]++;
    }
}

// void getCompressedCoordinatesDigits(int index, int bufferSize, int *digitBuffer)
// {
//     for (int i = 0; i < bufferSize; i++)
//     {
//         if (digitBuffer[i] > index)
//             digitBuffer[i]--;
//     }
// }

int getDecompressedCoordinates(int compressedCoords, int index, int shareHolders, int bufferSize, int *digitBuffer)
{
    getBaseDecompositionFromNumber(compressedCoords, shareHolders - 1, bufferSize, digitBuffer);
    getDecompressedCoordinatesDigits(index, bufferSize, digitBuffer);
    return getNumberFromBaseDecomposition(shareHolders, bufferSize, digitBuffer);
}

int getCompressedCoordinates(int compressedCoords, int index, int shareHolders, int bufferSize, int *digitBuffer)
{
    getBaseDecompositionFromNumber(compressedCoords, shareHolders, bufferSize, digitBuffer);
    // getCompressedCoordinatesDigits inlined to return -1 if coordinates is discarded
    for (int i = 0; i < bufferSize; i++)
    {
        if (digitBuffer[i] == index)
            return -1;
        if (digitBuffer[i] > index)
            digitBuffer[i]--;
    }
    return getNumberFromBaseDecomposition(shareHolders - 1, bufferSize, digitBuffer);
}

Key *decompressKey(CompressedKey *compressedKey)
{
    int shareHolders = compressedKey->shareHolders;
    int neededParts = compressedKey->neededParts;
    int chunkSize = compressedKey->chunkSize;
    int index = compressedKey->index;

    int depth = neededParts - 1;

    int fullSize = chunkSize * int_pow(shareHolders, depth);
    int compressedSize = chunkSize * int_pow(shareHolders - 1, depth);

    uint8_t *buffer = malloc(sizeof(*buffer) * fullSize);
    memset(buffer, 0, sizeof buffer);

    int digitBuffer[depth];
    for (int i = 0; i < compressedSize; i++)
    {
        int coords = getDecompressedCoordinates(i, index, shareHolders, depth, digitBuffer);
        buffer[coords] = compressedKey->data[i];
    }
    Key *k = malloc(sizeof(*k));
    k->shareHolders = shareHolders;
    k->neededParts = neededParts;
    k->chunkSize = chunkSize;
    k->index = index;
    k->data = buffer;
    return k;
}

CompressedKey *compressKey(Key *key)
{
    int shareHolders = key->shareHolders;
    int neededParts = key->neededParts;
    int chunkSize = key->chunkSize;
    int index = key->index;

    int depth = neededParts - 1;

    int fullSize = chunkSize * int_pow(shareHolders, depth);
    int compressedSize = chunkSize * int_pow(shareHolders - 1, depth);

    uint8_t *buffer = malloc(sizeof(*buffer) * compressedSize);

    int digitBuffer[depth];
    for (int i = 0; i < fullSize; i++)
    {
        int coords = getCompressedCoordinates(i, index, shareHolders, depth, digitBuffer);
        if (coords >= 0)
            buffer[coords] = key->data[i];
    }
    CompressedKey *k = malloc(sizeof(*k));
    k->shareHolders = shareHolders;
    k->neededParts = neededParts;
    k->chunkSize = chunkSize;
    k->index = index;
    k->data = buffer;
    return k;
}

Key *regenerateKey(CompressedKey **parts)
{
    CompressedKey *firstPart = parts[0];
    int shareHolders = firstPart->shareHolders;
    int neededParts = firstPart->neededParts;
    int chunkSize = firstPart->chunkSize;

    int depth = neededParts - 1;

    int compressedSize = chunkSize * int_pow(shareHolders - 1, depth);
    int fullSize = chunkSize * int_pow(shareHolders, depth);
    uint8_t *buffer = malloc(sizeof(*buffer) * fullSize);

    int digitBuffer[depth];

    for (int i = 0; i < fullSize; i++)
    {
        int coords = -1;
        int key = 0;
        while (coords < 0 && key < shareHolders)
            coords = getCompressedCoordinates(i, parts[key++]->index, shareHolders, depth, digitBuffer);

        if (key >= shareHolders)
            printf("wtf"),
                fflush(stdout);
        if (coords >= 0)
            buffer[i] = parts[key - 1]->data[coords];
    }

    Key *k = malloc(sizeof(*k));
    k->shareHolders = shareHolders;
    k->neededParts = neededParts;
    k->chunkSize = chunkSize;
    k->index = -1;
    k->data = buffer;
    return k;
}

CompressedKey *generateCompressedPartialKey(Key *fullKey, int index)
{
    // the idea is to skip the zeroing part and to pass the full key to the "compression" algorithm.
    // that way the bytes that should be erased out first will be discared immediately instead
    // so it 's a gain of time
    Key tempKey;
    tempKey.shareHolders = fullKey->shareHolders;
    tempKey.neededParts = fullKey->neededParts;
    tempKey.chunkSize = fullKey->chunkSize;
    tempKey.index = index;
    tempKey.data = fullKey->data;
    return compressKey(&tempKey);
}

void printHexBuffer(uint8_t *buffer, int bufferLength)
{
    for (int i = 0; i < bufferLength; i++)
    {
        printf("%02X", buffer[i]);
    }
    printf("\n");
}

int main(int argc, char **argv)
{
    // olders: 5
    // needed: 3
    // chunksize: 1
    // 000000000000ad608d3d00f977fa7c0016912c5f00aaa385b6 0
    // 8b0003e6fc00000000007f0077fa7c5000912c5fd600a385b6 1
    // 8b3800e6fc76ad008d3d00000000005016002c5fd6aa0085b6 2
    // 8b380300fc76ad60003d7ff977007c0000000000d6aaa300b6 3
    // 8b3803e60076ad608d007ff977fa005016912c000000000000 4

    const int fullsize = 25;
    const int compressedSize = 16;

    uint8_t key0data[] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xad, 0x60, 0x8d, 0x3d, 0x00, 0xf9, 0x77, 0xfa, 0x7c, 0x00, 0x16, 0x91, 0x2c, 0x5f, 0x00, 0xaa, 0xa3, 0x85, 0xb6};
    Key key0;
    key0.shareHolders = 5;
    key0.neededParts = 3;
    key0.chunkSize = 1;
    key0.index = 0;
    key0.data = key0data;
    printHexBuffer(key0.data, 25);

    CompressedKey *cKey0 = compressKey(&key0);
    printHexBuffer(cKey0->data, 16);

    Key *dcKey0 = decompressKey(cKey0);
    printHexBuffer(dcKey0->data, 25);

    printf("\n");

    uint8_t key1data[] = {0x8b, 0x00, 0x03, 0xe6, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7f, 0x00, 0x77, 0xfa, 0x7c, 0x50, 0x00, 0x91, 0x2c, 0x5f, 0xd6, 0x00, 0xa3, 0x85, 0xb6};
    Key key1;
    key1.shareHolders = 5;
    key1.neededParts = 3;
    key1.chunkSize = 1;
    key1.index = 1;
    key1.data = key1data;
    printHexBuffer(key1.data, 25);

    CompressedKey *cKey1 = compressKey(&key1);
    printHexBuffer(cKey1->data, 16);

    Key *dcKey1 = decompressKey(cKey1);
    printHexBuffer(dcKey1->data, 25);

    printf("\n");

    uint8_t key4data[] = {0x8b, 0x38, 0x03, 0xe6, 0x00, 0x76, 0xad, 0x60, 0x8d, 0x00, 0x7f, 0xf9, 0x77, 0xfa, 0x00, 0x50, 0x16, 0x91, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
    Key key4;
    key4.shareHolders = 5;
    key4.neededParts = 3;
    key4.chunkSize = 1;
    key4.index = 4;
    key4.data = key4data;
    printHexBuffer(key4.data, 25);

    CompressedKey *cKey4 = compressKey(&key4);
    printHexBuffer(cKey4->data, 16);

    Key *dcKey4 = decompressKey(cKey4);
    printHexBuffer(dcKey4->data, 25);

    printf("\n");

    CompressedKey *compressedKeys[] = {cKey0, cKey1, cKey4};

    Key *decrypted = regenerateKey(compressedKeys);
    printHexBuffer(decrypted->data, 25);

    printf("\n");

    CompressedKey *gcKey1 = generateCompressedPartialKey(decrypted, 1);
    printHexBuffer(cKey1->data, 16);
    printHexBuffer(gcKey1->data, 16);
    printf("\n");

    CompressedKey *gcKey0 = generateCompressedPartialKey(decrypted, 0);
    printHexBuffer(cKey0->data, 16);
    printHexBuffer(gcKey0->data, 16);
    printf("\n");

    CompressedKey *gcKey4 = generateCompressedPartialKey(decrypted, 4);
    printHexBuffer(cKey4->data, 16);
    printHexBuffer(gcKey4->data, 16);
    printf("\n");

    return 0;
}