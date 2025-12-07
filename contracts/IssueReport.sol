// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IssueReport {

    struct Report {
        address reporter;
        string imageHash;
        string issueType;
        uint256 baseSeverity;
        uint256 adjustedSeverity;
        string location;
        uint256 timestamp;
        bytes32 aiHash;
        bool aiVerified;
    }

    Report[] public reports;

    event IssueSubmitted(uint256 indexed id, address reporter);
    event AIHashSubmitted(uint256 indexed id, bytes32 aiHash);

    // Submit issue
    function submitIssue(
        string memory _imageHash,
        string memory _issueType,
        uint256 _baseSeverity,
        string memory _location
    ) public {

        // adjustedSeverity = baseSeverity (no FTSO call)
        uint256 adjusted = _baseSeverity;

        reports.push(
            Report(
                msg.sender,
                _imageHash,
                _issueType,
                _baseSeverity,
                adjusted,
                _location,
                block.timestamp,
                0x0,
                false
            )
        );

        emit IssueSubmitted(reports.length - 1, msg.sender);
    }

    // Store AI verification hash (FDC-style)
    function submitAIHash(uint256 reportId, bytes32 aiHash) public {
        require(reportId < reports.length, "Invalid report ID");

        reports[reportId].aiHash = aiHash;
        reports[reportId].aiVerified = true;

        emit AIHashSubmitted(reportId, aiHash);
    }

    function totalReports() public view returns (uint256) {
        return reports.length;
    }
}
