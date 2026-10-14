/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solhealth.json`.
 */
export type Solhealth = {
  "address": "6EZgFcGtnBqhor99gzCoqyzqRpfrU9fyP6NRUuqqS7xe",
  "metadata": {
    "name": "solhealth",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "accessRecord",
      "discriminator": [
        210,
        27,
        210,
        107,
        205,
        117,
        250,
        236
      ],
      "accounts": [
        {
          "name": "record",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99
                ]
              },
              {
                "kind": "account",
                "path": "record.patient",
                "account": "record"
              },
              {
                "kind": "account",
                "path": "record.record_id",
                "account": "record"
              }
            ]
          },
          "relations": [
            "access"
          ]
        },
        {
          "name": "credential",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "doctor"
              }
            ]
          }
        },
        {
          "name": "access",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99
                ]
              },
              {
                "kind": "account",
                "path": "record"
              },
              {
                "kind": "account",
                "path": "doctor"
              }
            ]
          }
        },
        {
          "name": "doctor",
          "signer": true,
          "relations": [
            "credential",
            "access"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "grantAccess",
      "discriminator": [
        66,
        88,
        87,
        113,
        39,
        22,
        27,
        165
      ],
      "accounts": [
        {
          "name": "record",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99
                ]
              },
              {
                "kind": "account",
                "path": "record.patient",
                "account": "record"
              },
              {
                "kind": "account",
                "path": "record.record_id",
                "account": "record"
              }
            ]
          }
        },
        {
          "name": "credential",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "doctor"
              }
            ]
          }
        },
        {
          "name": "access",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99
                ]
              },
              {
                "kind": "account",
                "path": "record"
              },
              {
                "kind": "arg",
                "path": "doctor"
              }
            ]
          }
        },
        {
          "name": "patient",
          "writable": true,
          "signer": true,
          "relations": [
            "record"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "doctor",
          "type": "pubkey"
        },
        {
          "name": "durationSecs",
          "type": "i64"
        },
        {
          "name": "wrappedKey",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "initializeConfig",
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "issueCredential",
      "discriminator": [
        255,
        193,
        171,
        224,
        68,
        171,
        194,
        87
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "credential",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "doctor"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "doctor",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "registerRecord",
      "discriminator": [
        103,
        97,
        165,
        251,
        237,
        159,
        114,
        203
      ],
      "accounts": [
        {
          "name": "record",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99
                ]
              },
              {
                "kind": "account",
                "path": "patient"
              },
              {
                "kind": "arg",
                "path": "recordId"
              }
            ]
          }
        },
        {
          "name": "patient",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "recordId",
          "type": "u64"
        },
        {
          "name": "cid",
          "type": "string"
        },
        {
          "name": "fileHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "wrappedKey",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "revokeAccess",
      "discriminator": [
        106,
        128,
        38,
        169,
        103,
        238,
        102,
        147
      ],
      "accounts": [
        {
          "name": "record",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99
                ]
              },
              {
                "kind": "account",
                "path": "record.patient",
                "account": "record"
              },
              {
                "kind": "account",
                "path": "record.record_id",
                "account": "record"
              }
            ]
          },
          "relations": [
            "access"
          ]
        },
        {
          "name": "access",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99
                ]
              },
              {
                "kind": "account",
                "path": "record"
              },
              {
                "kind": "account",
                "path": "access.doctor",
                "account": "access"
              }
            ]
          }
        },
        {
          "name": "patient",
          "signer": true,
          "relations": [
            "record"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "revokeCredential",
      "discriminator": [
        38,
        123,
        95,
        95,
        223,
        158,
        169,
        87
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "credential",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "credential.doctor",
                "account": "credential"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "access",
      "discriminator": [
        117,
        154,
        108,
        210,
        202,
        83,
        96,
        222
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "credential",
      "discriminator": [
        145,
        44,
        68,
        220,
        67,
        46,
        100,
        135
      ]
    },
    {
      "name": "record",
      "discriminator": [
        254,
        233,
        117,
        252,
        76,
        166,
        146,
        139
      ]
    }
  ],
  "events": [
    {
      "name": "accessGranted",
      "discriminator": [
        21,
        212,
        83,
        192,
        198,
        26,
        62,
        185
      ]
    },
    {
      "name": "accessRevoked",
      "discriminator": [
        200,
        160,
        73,
        43,
        201,
        165,
        43,
        159
      ]
    },
    {
      "name": "credentialIssued",
      "discriminator": [
        194,
        216,
        28,
        159,
        89,
        29,
        72,
        177
      ]
    },
    {
      "name": "credentialRevoked",
      "discriminator": [
        127,
        131,
        241,
        234,
        50,
        139,
        145,
        204
      ]
    },
    {
      "name": "recordAccessed",
      "discriminator": [
        122,
        197,
        83,
        151,
        200,
        243,
        18,
        12
      ]
    },
    {
      "name": "recordRegistered",
      "discriminator": [
        94,
        164,
        33,
        178,
        82,
        149,
        25,
        15
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6001,
      "name": "credentialInactive",
      "msg": "Doctor credential is inactive"
    },
    {
      "code": 6002,
      "name": "accessRevoked",
      "msg": "Access has been revoked"
    },
    {
      "code": 6003,
      "name": "accessExpired",
      "msg": "Access has expired"
    },
    {
      "code": 6004,
      "name": "cidTooLong",
      "msg": "CID exceeds maximum length of 64"
    },
    {
      "code": 6005,
      "name": "keyTooLong",
      "msg": "Key exceeds maximum length of 128"
    }
  ],
  "types": [
    {
      "name": "access",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "record",
            "type": "pubkey"
          },
          {
            "name": "doctor",
            "type": "pubkey"
          },
          {
            "name": "wrappedKey",
            "type": "bytes"
          },
          {
            "name": "expiry",
            "type": "i64"
          },
          {
            "name": "revoked",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "accessGranted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "record",
            "type": "pubkey"
          },
          {
            "name": "patient",
            "type": "pubkey"
          },
          {
            "name": "doctor",
            "type": "pubkey"
          },
          {
            "name": "expiry",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "accessRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "record",
            "type": "pubkey"
          },
          {
            "name": "patient",
            "type": "pubkey"
          },
          {
            "name": "doctor",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "credential",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "doctor",
            "type": "pubkey"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "issuedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "credentialIssued",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "doctor",
            "type": "pubkey"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "credentialRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "doctor",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "record",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "patient",
            "type": "pubkey"
          },
          {
            "name": "recordId",
            "type": "u64"
          },
          {
            "name": "cid",
            "type": "string"
          },
          {
            "name": "fileHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "wrappedKey",
            "type": "bytes"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "recordAccessed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "record",
            "type": "pubkey"
          },
          {
            "name": "doctor",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "recordRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "patient",
            "type": "pubkey"
          },
          {
            "name": "record",
            "type": "pubkey"
          },
          {
            "name": "recordId",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
