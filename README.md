# Snake-Game-QR

A HTML snake game encoded in QR code.

![QR-Code](./qr-code.png)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development purposes.

### Requirements

To install and run this project you need:

- [Bun](https://bun.sh/ "Bun")
- [git](https://git-scm.com/downloads "git") (only to clone this repository)

### Installation

To set up everything in your local machine, you need to follow these steps:

1. Clone this repo and then change directory to the `snake-game-qr` folder:

```bash
$ git clone https://github.com/kaushalmeena/snake-game-qr.git
$ cd snake-game-qr
```

2. Install project dependencies using npm:

```bash
$ bun install
```

## Usage

To create qr-code.png file from input.html run:

```bash
$ bun run encode
```

To create output.html file from qr-code.png run:

```bash
$ bun run decode
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
