// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Certificate is Ownable {
    struct CertificateData {
        string courseId;
        string userId;
        uint256 timestamp;
        bool exists;
    }

    // Maparea principală a certificatelor
    mapping(string => mapping(string => CertificateData)) public certificates;
    
    // Mapare pentru a ține evidența certificatelor pe utilizator
    mapping(string => string[]) private userCourses;
    
    event CertificateIssued(string indexed courseId, string indexed userId, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    function issueCertificate(string memory courseId, string memory userId) public onlyOwner {
        require(!certificates[courseId][userId].exists, "Certificate already exists");
        
        certificates[courseId][userId] = CertificateData({
            courseId: courseId,
            userId: userId,
            timestamp: block.timestamp,
            exists: true
        });

        // Adăugăm cursul la lista utilizatorului
        userCourses[userId].push(courseId);
        
        emit CertificateIssued(courseId, userId, block.timestamp);
    }

    function getCertificate(string memory courseId, string memory userId) public view returns (CertificateData memory) {
        return certificates[courseId][userId];
    }

    function getCertificatesByOwner(string memory userId) public view returns (CertificateData[] memory) {
        // Obținem numărul de certificate ale utilizatorului
        uint256 certificateCount = userCourses[userId].length;
        
        // Creăm un array pentru a stoca certificatele
        CertificateData[] memory userCertificates = new CertificateData[](certificateCount);
        
        // Parcurgem fiecare curs al utilizatorului și adăugăm certificatul în array
        for (uint256 i = 0; i < certificateCount; i++) {
            string memory courseId = userCourses[userId][i];
            userCertificates[i] = certificates[courseId][userId];
        }
        
        return userCertificates;
    }
} 