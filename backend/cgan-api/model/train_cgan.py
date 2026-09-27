import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from PIL import Image
import os
import pandas as pd
from cgan import Generator, Discriminator, LATENT_DIM, NUM_CLASSES

IMG_SIZE = 128
BATCH_SIZE = 16
EPOCHS = 100
LR = 0.0002
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

class BloodCellDataset(Dataset):
    def __init__(self, img_dir, labels_csv, img_size=IMG_SIZE):
        self.df = pd.read_csv(labels_csv)
        self.img_dir = img_dir
        self.tf = transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize([0.5]*3, [0.5]*3)
        ])

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        # Path is images/{folder}/{filename}
        img_path = os.path.join(self.img_dir, row["folder"], row["filename"])
        img = Image.open(img_path).convert("RGB")
        
        # One-hot encode the class label
        label = row["label"]
        cond = torch.zeros(NUM_CLASSES)
        cond[label] = 1.0
        
        return self.tf(img), cond

def train():
    G = Generator().to(DEVICE)
    D = Discriminator().to(DEVICE)
    criterion = nn.BCELoss()
    opt_G = torch.optim.Adam(G.parameters(), lr=LR, betas=(0.5, 0.999))
    opt_D = torch.optim.Adam(D.parameters(), lr=LR, betas=(0.5, 0.999))

    dataset = BloodCellDataset("../../datasets/images", "../../datasets/labels.csv")
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    for epoch in range(EPOCHS):
        for i, (imgs, conds) in enumerate(loader):
            imgs, conds = imgs.to(DEVICE), conds.to(DEVICE)
            bs = imgs.size(0)

            real = torch.ones(bs, 1).to(DEVICE)
            fake = torch.zeros(bs, 1).to(DEVICE)

            # Train Generator
            opt_G.zero_grad()
            noise = torch.randn(bs, LATENT_DIM).to(DEVICE)
            gen_imgs = G(noise, conds)
            g_loss = criterion(D(gen_imgs), real)
            g_loss.backward()
            opt_G.step()

            # Train Discriminator
            opt_D.zero_grad()
            real_loss = criterion(D(imgs), real)
            fake_loss = criterion(D(gen_imgs.detach()), fake)
            d_loss = (real_loss + fake_loss) / 2
            d_loss.backward()
            opt_D.step()

        print(f"Epoch {epoch+1}/{EPOCHS} | D: {d_loss.item():.4f} | G: {g_loss.item():.4f}")

    torch.save(G.state_dict(), "generator.pth")
    print(" Saved generator.pth")

if __name__ == "__main__":
    train()