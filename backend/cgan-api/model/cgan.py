import torch
import torch.nn as nn

LATENT_DIM = 100
NUM_CLASSES = 5      # all, aml, cll, cml, healthy
COND_DIM = NUM_CLASSES
IMG_CHANNELS = 3

class Generator(nn.Module):
    def __init__(self, img_size=128):
        super().__init__()
        self.img_size = img_size
        self.init_size = img_size // 16
        # Takes noise + one-hot class vector
        self.fc = nn.Linear(LATENT_DIM + COND_DIM, 128 * self.init_size ** 2)

        self.conv_blocks = nn.Sequential(
            nn.BatchNorm2d(128),
            nn.Upsample(scale_factor=2),
            nn.Conv2d(128, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.Upsample(scale_factor=2),
            nn.Conv2d(128, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Upsample(scale_factor=2),
            nn.Conv2d(64, 32, 3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Upsample(scale_factor=2),
            nn.Conv2d(32, IMG_CHANNELS, 3, padding=1),
            nn.Tanh()
        )

    def forward(self, noise, condition):
        x = torch.cat([noise, condition], dim=1)
        out = self.fc(x)
        out = out.view(out.size(0), 128, self.init_size, self.init_size)
        return self.conv_blocks(out)


class Discriminator(nn.Module):
    def __init__(self, img_size=128):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(IMG_CHANNELS, 32, 4, 2, 1),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Conv2d(32, 64, 4, 2, 1),
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Conv2d(64, 128, 4, 2, 1),
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2, inplace=True),
        )
        self.fc = nn.Linear(128 * (img_size // 8) ** 2, 1)

    def forward(self, img):
        out = self.conv(img)
        out = out.view(out.size(0), -1)
        return torch.sigmoid(self.fc(out))