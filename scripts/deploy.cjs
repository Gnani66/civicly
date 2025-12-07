const { ethers } = require("hardhat");

async function main() {
  const IssueReport = await ethers.getContractFactory("IssueReport");

  // No constructor arguments now
  const issueReport = await IssueReport.deploy();

  await issueReport.waitForDeployment();

  console.log("FixIt.AI Contract deployed at:", await issueReport.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
