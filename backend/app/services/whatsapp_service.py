import urllib.request
import urllib.parse
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

def send_whatsapp_message(message: str, target: str = None) -> dict:
    """
    Sends a WhatsApp message via the local Node.js Gateway.
    If target is not specified, it will use the default WHATSAPP_GROUP_ID from settings.
    """
    gateway_url = settings.WHATSAPP_GATEWAY_URL
    # Trim trailing slashes from gateway URL and append /send
    send_url = f"{gateway_url.rstrip('/')}/send"
    
    # Use default group if target is not specified
    recipient = target or settings.WHATSAPP_GROUP_ID
    
    if not recipient:
        logger.warning("WhatsApp message not sent: No recipient (target) or default WHATSAPP_GROUP_ID specified.")
        return {"success": False, "error": "No recipient specified"}
        
    payload = {
        "target": recipient,
        "message": message
    }
    
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            send_url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        
        # Send request with a 10 second timeout
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            result = json.loads(res_body)
            logger.info(f"WhatsApp message successfully sent to {recipient}: {result}")
            return result
            
    except urllib.error.URLError as e:
        logger.error(f"Failed to connect to WhatsApp Gateway at {send_url}: {e}")
        return {"success": False, "error": "Failed to connect to gateway", "details": str(e)}
    except Exception as e:
        logger.error(f"Error occurred while sending WhatsApp message: {e}")
        return {"success": False, "error": "Internal error", "details": str(e)}
