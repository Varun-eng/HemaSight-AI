import torch
from model.cgan import Generator

G = Generator()
torch.save(G.state_dict(), "model/generator.pth")
print("Created dummy generator.pth")
