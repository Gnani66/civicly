import { ethers } from "ethers";
import IssueReport from "./IssueReport.json";

const CONTRACT_ADDRESS = "0x8d1C11dD302E043E50123C270176138E95E554c4"; // your latest address

// Helper function to get the Ethereum provider
export const getProvider = () => {
  if (!window.ethereum) return null;
  return new ethers.BrowserProvider(window.ethereum);
};

// Get the contract instance
export const getContract = async () => {
  if (!window.ethereum) {
    alert("Please install MetaMask!");
    return null;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new ethers.Contract(CONTRACT_ADDRESS, IssueReport.abi, signer);
};

// Function to fetch all reports from the contract
export const fetchReports = async () => {
  try {
    const contract = await getContract();
    if (!contract) return [];

    // Assuming your contract has a function called getAllReports()
    const reports = await contract.getAllReports();
    return reports;
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
};
