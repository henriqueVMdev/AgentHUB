package com.hrb.agentspool.integration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface InboxMessageRepository extends JpaRepository<InboxMessage,Long>{List<InboxMessage> findByConversationIdOrderByCreatedAtAsc(Long id);}
