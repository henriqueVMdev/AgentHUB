package com.hrb.agentspool.integration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface InboxConversationRepository extends JpaRepository<InboxConversation,Long>{
 List<InboxConversation> findAllByOrderByUpdatedAtDesc();
 Optional<InboxConversation> findFirstByIntegrationIdAndExternalContactIdAndStatusNotOrderByUpdatedAtDesc(Long integrationId,String externalContactId,String status);
}
