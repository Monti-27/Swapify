/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/weswap.json`.
 */
export type Weswap = {
  "address": "7UiSkmJek7KrNyUFLBi4vphdimZuYh2iGRNpAfzwKR8r",
  "metadata": {
    "name": "weswap",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createStrategy",
      "discriminator": [
        152,
        160,
        107,
        148,
        245,
        190,
        127,
        224
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "strategy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  114,
                  97,
                  116,
                  101,
                  103,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.id"
              }
            ]
          }
        },
        {
          "name": "global",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "strategy"
              }
            ]
          }
        },
        {
          "name": "sellTokenMint"
        },
        {
          "name": "sellTokenProgram"
        },
        {
          "name": "buyTokenMint"
        },
        {
          "name": "buyTokenProgram"
        },
        {
          "name": "ownerTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "sellTokenProgram"
              },
              {
                "kind": "account",
                "path": "sellTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "escrowTokenAccount",
          "docs": [
            "Authority is escrow PDA - escrow PDA can sign for transfers via invoke_signed"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "sellTokenProgram"
              },
              {
                "kind": "account",
                "path": "sellTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createStrategyParams"
            }
          }
        }
      ]
    },
    {
      "name": "depositEscrow",
      "discriminator": [
        226,
        112,
        158,
        176,
        178,
        118,
        153,
        128
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "global",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "strategy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  114,
                  97,
                  116,
                  101,
                  103,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.id"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "strategy"
              }
            ]
          }
        },
        {
          "name": "sellTokenMint"
        },
        {
          "name": "sellTokenProgram"
        },
        {
          "name": "buyTokenMint"
        },
        {
          "name": "buyTokenProgram"
        },
        {
          "name": "ownerTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "sellTokenProgram"
              },
              {
                "kind": "account",
                "path": "sellTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "escrowTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "sellTokenProgram"
              },
              {
                "kind": "account",
                "path": "sellTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "depositEscrowParams"
            }
          }
        }
      ]
    },
    {
      "name": "executeExit",
      "docs": [
        "Execute TP/SL exit for a FILLED strategy"
      ],
      "discriminator": [
        130,
        90,
        198,
        58,
        73,
        242,
        0,
        236
      ],
      "accounts": [
        {
          "name": "keeper",
          "docs": [
            "Keeper pays gas - ONLY signer required"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "owner"
        },
        {
          "name": "global",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "strategy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  114,
                  97,
                  116,
                  101,
                  103,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "strategy.owner",
                "account": "strategy"
              },
              {
                "kind": "arg",
                "path": "params.strategy_id"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "strategy"
              }
            ]
          }
        },
        {
          "name": "exitSellTokenMint",
          "docs": [
            "The token we're selling on exit (buy_token from entry - profits held in escrow)"
          ]
        },
        {
          "name": "exitSellTokenProgram"
        },
        {
          "name": "exitBuyTokenMint",
          "docs": [
            "The token we're buying on exit (sell_token from entry - going back to base)"
          ]
        },
        {
          "name": "exitBuyTokenProgram"
        },
        {
          "name": "escrowExitSellTokenAccount",
          "docs": [
            "Escrow's token account holding the profits from entry (used as source for exit swap)",
            "This is the buy_token from entry, which becomes sell_token for exit"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "exitSellTokenProgram"
              },
              {
                "kind": "account",
                "path": "exitSellTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "escrowReceiveTokenAccount",
          "docs": [
            "Escrow's ATA for the exit_buy_token (used as destination in BOOMERANG mode)",
            "When boomerang_mode is true, funds go here instead of owner",
            "This keeps the tokens in escrow, ready for the next leg of the round trip"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "exitBuyTokenProgram"
              },
              {
                "kind": "account",
                "path": "exitBuyTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "ownerReceiveTokenAccount",
          "docs": [
            "Owner's token account to receive the exit proceeds (used in NORMAL mode)",
            "When boomerang_mode is false, funds go here (cash out to user)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "exitBuyTokenProgram"
              },
              {
                "kind": "account",
                "path": "exitBuyTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "treasury"
        },
        {
          "name": "treasuryTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasury"
              },
              {
                "kind": "account",
                "path": "exitBuyTokenProgram"
              },
              {
                "kind": "account",
                "path": "exitBuyTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "jupiterProgram"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Required for init_if_needed on escrow_receive_token_account"
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "docs": [
            "Required for init_if_needed (pays rent for new ATA)"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "executeExitParams"
            }
          }
        },
        {
          "name": "jupiterInstructionData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "executeStrategy",
      "discriminator": [
        164,
        197,
        251,
        183,
        219,
        177,
        85,
        161
      ],
      "accounts": [
        {
          "name": "keeper",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner"
        },
        {
          "name": "global",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "strategy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  114,
                  97,
                  116,
                  101,
                  103,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "strategy.owner",
                "account": "strategy"
              },
              {
                "kind": "arg",
                "path": "params.strategy_id"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "strategy"
              }
            ]
          }
        },
        {
          "name": "sellTokenMint"
        },
        {
          "name": "sellTokenProgram"
        },
        {
          "name": "buyTokenMint"
        },
        {
          "name": "buyTokenProgram"
        },
        {
          "name": "escrowTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "sellTokenProgram"
              },
              {
                "kind": "account",
                "path": "sellTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "ownerReceiveTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "buyTokenProgram"
              },
              {
                "kind": "account",
                "path": "buyTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "treasury"
        },
        {
          "name": "treasuryTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasury"
              },
              {
                "kind": "account",
                "path": "buyTokenProgram"
              },
              {
                "kind": "account",
                "path": "buyTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "jupiterProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "executeStrategyParams"
            }
          }
        },
        {
          "name": "jupiterInstructionData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "global",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "treasury"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "initializeParams"
            }
          }
        }
      ]
    },
    {
      "name": "manageKeepers",
      "discriminator": [
        27,
        40,
        211,
        52,
        176,
        212,
        83,
        223
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "global",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "manageKeepersParams"
            }
          }
        }
      ]
    },
    {
      "name": "withdrawEscrow",
      "discriminator": [
        81,
        84,
        226,
        128,
        245,
        47,
        96,
        104
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "global",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "strategy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  114,
                  97,
                  116,
                  101,
                  103,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.id"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "strategy"
              }
            ]
          }
        },
        {
          "name": "withdrawTokenMint",
          "docs": [
            "The token mint to withdraw - MUST be either sell_token_mint OR buy_token_mint from strategy",
            "This allows withdrawing whichever token is currently in the escrow (for mid-trade cancellation)"
          ]
        },
        {
          "name": "withdrawTokenProgram"
        },
        {
          "name": "ownerTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "withdrawTokenProgram"
              },
              {
                "kind": "account",
                "path": "withdrawTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "escrowTokenAccount",
          "docs": [
            "Escrow's token account for the withdraw_token_mint"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "withdrawTokenProgram"
              },
              {
                "kind": "account",
                "path": "withdrawTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "withdrawEscrowParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "global",
      "discriminator": [
        167,
        232,
        232,
        177,
        200,
        108,
        114,
        127
      ]
    },
    {
      "name": "strategy",
      "discriminator": [
        174,
        110,
        39,
        119,
        82,
        106,
        169,
        102
      ]
    },
    {
      "name": "strategyEscrow",
      "discriminator": [
        92,
        37,
        37,
        7,
        115,
        68,
        208,
        196
      ]
    }
  ],
  "events": [
    {
      "name": "cancelStrategyEvent",
      "discriminator": [
        115,
        251,
        38,
        11,
        217,
        122,
        9,
        169
      ]
    },
    {
      "name": "createStrategyEvent",
      "discriminator": [
        95,
        184,
        21,
        242,
        124,
        223,
        203,
        226
      ]
    },
    {
      "name": "depositEscrowEvent",
      "discriminator": [
        80,
        255,
        40,
        85,
        138,
        13,
        199,
        66
      ]
    },
    {
      "name": "executeStrategyEvent",
      "discriminator": [
        197,
        247,
        59,
        197,
        240,
        113,
        74,
        211
      ]
    },
    {
      "name": "updateStrategyEvent",
      "discriminator": [
        25,
        246,
        49,
        26,
        28,
        113,
        142,
        146
      ]
    },
    {
      "name": "withdrawEscrowEvent",
      "discriminator": [
        146,
        99,
        17,
        180,
        230,
        68,
        73,
        58
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidMints",
      "msg": "Sell and buy tokens must be different"
    },
    {
      "code": 6001,
      "name": "invalidTriggerPrice",
      "msg": "Trigger price must be greater than 0"
    },
    {
      "code": 6002,
      "name": "invalidPrecision",
      "msg": "Price precision cannot exceed 18"
    },
    {
      "code": 6003,
      "name": "insufficientDeposit",
      "msg": "Must deposit at least some tokens to escrow"
    },
    {
      "code": 6004,
      "name": "invalidTakeProfit",
      "msg": "Take profit price must be >= trigger price"
    },
    {
      "code": 6005,
      "name": "invalidStopLoss",
      "msg": "Stop loss price must be <= trigger price"
    },
    {
      "code": 6006,
      "name": "invalidSellAmount",
      "msg": "Invalid sell amount configuration"
    },
    {
      "code": 6007,
      "name": "strategyNotActive",
      "msg": "Strategy is not active"
    },
    {
      "code": 6008,
      "name": "strategyAlreadyExecuted",
      "msg": "Strategy already executed"
    },
    {
      "code": 6009,
      "name": "strategyNotFound",
      "msg": "Strategy not found or unauthorized"
    },
    {
      "code": 6010,
      "name": "invalidCurrentPrice",
      "msg": "Invalid current price for execution"
    },
    {
      "code": 6011,
      "name": "insufficientEscrow",
      "msg": "Insufficient funds in escrow"
    },
    {
      "code": 6012,
      "name": "noEscrowTokens",
      "msg": "Strategy has no escrow or tokens"
    },
    {
      "code": 6013,
      "name": "protocolNotInitialized",
      "msg": "Protocol is not initialized"
    },
    {
      "code": 6014,
      "name": "protocolPaused",
      "msg": "Protocol is paused"
    },
    {
      "code": 6015,
      "name": "newStrategiesDisabled",
      "msg": "New strategies are disabled"
    },
    {
      "code": 6016,
      "name": "unauthorizedKeeper",
      "msg": "Keeper is not authorized"
    },
    {
      "code": 6017,
      "name": "invalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 6018,
      "name": "invalidAmount",
      "msg": "Cannot withdraw all funds - use cancel_strategy instead"
    },
    {
      "code": 6019,
      "name": "invalidProgram",
      "msg": "Invalid program"
    },
    {
      "code": 6020,
      "name": "invalidAccountCount",
      "msg": "Invalid account count"
    },
    {
      "code": 6021,
      "name": "noTokensReceived",
      "msg": "No tokens received from swap"
    },
    {
      "code": 6022,
      "name": "maxStrategiesExceeded",
      "msg": "Strategy ID exceeds maximum allowed strategies"
    },
    {
      "code": 6023,
      "name": "invalidTokenProgram",
      "msg": "Token program does not match mint's owner"
    },
    {
      "code": 6024,
      "name": "strategyNotFilled",
      "msg": "Strategy is not in Filled state - cannot execute exit"
    },
    {
      "code": 6025,
      "name": "exitConditionNotMet",
      "msg": "Neither Take Profit nor Stop Loss condition is met"
    },
    {
      "code": 6026,
      "name": "invalidTokenMint",
      "msg": "Token mint must be either sell_token_mint or buy_token_mint from strategy"
    }
  ],
  "types": [
    {
      "name": "cancelStrategyEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "strategy",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "cancelledAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "createStrategyEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "strategy",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "sellTokenMint",
            "type": "pubkey"
          },
          {
            "name": "buyTokenMint",
            "type": "pubkey"
          },
          {
            "name": "sellTokenDecimals",
            "type": "u8"
          },
          {
            "name": "buyTokenDecimals",
            "type": "u8"
          },
          {
            "name": "triggerPrice",
            "type": "u64"
          },
          {
            "name": "pricePrecision",
            "type": "u8"
          },
          {
            "name": "takeProfitPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stopLossPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "sellAmount",
            "type": "u64"
          },
          {
            "name": "usePercentage",
            "type": "bool"
          },
          {
            "name": "boomerangMode",
            "type": "bool"
          },
          {
            "name": "depositAmount",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "createStrategyParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "direction",
            "type": {
              "defined": {
                "name": "orderDirection"
              }
            }
          },
          {
            "name": "triggerPrice",
            "type": "u64"
          },
          {
            "name": "pricePrecision",
            "type": "u8"
          },
          {
            "name": "takeProfitPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stopLossPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "sellAmount",
            "type": "u64"
          },
          {
            "name": "usePercentage",
            "type": "bool"
          },
          {
            "name": "boomerangMode",
            "type": "bool"
          },
          {
            "name": "depositAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "depositEscrowEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "strategy",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "sellTokenMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "newTotalDeposited",
            "type": "u64"
          },
          {
            "name": "depositedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "depositEscrowParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "executeExitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "strategyId",
            "type": "u64"
          },
          {
            "name": "currentPrice",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "executeStrategyEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "strategy",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "sellTokenMint",
            "type": "pubkey"
          },
          {
            "name": "buyTokenMint",
            "type": "pubkey"
          },
          {
            "name": "tokensSold",
            "type": "u64"
          },
          {
            "name": "tokensReceived",
            "type": "u64"
          },
          {
            "name": "executionPrice",
            "type": "u64"
          },
          {
            "name": "executedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "executeStrategyParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "strategyId",
            "type": "u64"
          },
          {
            "name": "currentPrice",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "global",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "initialized",
            "type": "bool"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "keepers",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "platformFeeBps",
            "type": "u16"
          },
          {
            "name": "maxStrategiesPerUser",
            "type": "u64"
          },
          {
            "name": "strategyCounter",
            "type": "u64"
          },
          {
            "name": "isPaused",
            "type": "bool"
          },
          {
            "name": "allowNewStrategies",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "initializeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "platformFeeBps",
            "type": "u16"
          },
          {
            "name": "maxStrategiesPerUser",
            "type": "u64"
          },
          {
            "name": "keepers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "keeperAction",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "add",
            "fields": [
              {
                "name": "keeper",
                "type": "pubkey"
              }
            ]
          },
          {
            "name": "remove",
            "fields": [
              {
                "name": "keeper",
                "type": "pubkey"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "manageKeepersParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "action",
            "type": {
              "defined": {
                "name": "keeperAction"
              }
            }
          }
        ]
      }
    },
    {
      "name": "orderDirection",
      "docs": [
        "Order direction - determines trigger comparison logic"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "buy"
          },
          {
            "name": "sell"
          }
        ]
      }
    },
    {
      "name": "strategy",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "sellTokenMint",
            "type": "pubkey"
          },
          {
            "name": "buyTokenMint",
            "type": "pubkey"
          },
          {
            "name": "sellTokenDecimals",
            "type": "u8"
          },
          {
            "name": "buyTokenDecimals",
            "type": "u8"
          },
          {
            "name": "direction",
            "type": {
              "defined": {
                "name": "orderDirection"
              }
            }
          },
          {
            "name": "triggerPrice",
            "type": "u64"
          },
          {
            "name": "pricePrecision",
            "type": "u8"
          },
          {
            "name": "takeProfitPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stopLossPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "sellAmount",
            "type": "u64"
          },
          {
            "name": "usePercentage",
            "type": "bool"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "strategyStatus"
              }
            }
          },
          {
            "name": "boomerangMode",
            "type": "bool"
          },
          {
            "name": "entryPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "entryTokensReceived",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "entryExecutedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "exitPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "exitTokensReceived",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "exitExecutedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "exitType",
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "executedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "executionPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "tokensReceived",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "strategyEscrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "strategy",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "sellTokenMint",
            "type": "pubkey"
          },
          {
            "name": "depositedAmount",
            "type": "u64"
          },
          {
            "name": "withdrawnAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "strategyStatus",
      "docs": [
        "Strategy lifecycle status"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "filled"
          },
          {
            "name": "closed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "updateStrategyEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "strategy",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "field",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "withdrawEscrowEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "strategy",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "withdrawTokenMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "newTotalWithdrawn",
            "type": "u64"
          },
          {
            "name": "withdrawnAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "withdrawEscrowParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "cancelStrategy",
            "type": "bool"
          }
        ]
      }
    }
  ]
};
